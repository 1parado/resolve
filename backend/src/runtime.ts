/**
 * runtime.ts —— 运行时任务存储 + SSE 进度订阅
 *
 * 职责：
 *  - 记录每条「市场调用 → 节点执行」的运行时任务（内存为实时权威，完成后落库 node_tasks）
 *  - 接收节点代理流式回传的 task_progress / task_result
 *  - 向订阅者（调用方 A / 节点归属方 B 的浏览器）推送 SSE 进度事件
 *  - 任务完成时结算费用（扣调用方余额）并累加成交量
 */
import { db } from './db/index.js'
import { now } from './utils/index.js'
import { spend } from './routes/wallet.js'
import type { ServerResponse } from 'node:http'

export type RuntimeStatus = 'running' | 'done' | 'failed' | 'timeout'

export interface RuntimeTask {
  taskId: string
  nodeId: string
  ownerUserId: string
  callerUserId: string
  itemId: string
  vendor: string
  agent: string
  prompt: string
  priceNum: number
  status: RuntimeStatus
  startedAt: number
  finishedAt: number
  log: string
  tokens: number
  cost: number
  ok: boolean
}

/** taskId → 运行时任务 */
const tasks = new Map<string, RuntimeTask>()
/** taskId → SSE 订阅者（浏览器 Response） */
const subs = new Map<string, Set<ServerResponse>>()

/* ---------- 生命周期 ---------- */

export function startRuntimeTask(meta: {
  taskId: string
  nodeId: string
  ownerUserId: string
  callerUserId: string
  itemId: string
  vendor: string
  agent: string
  prompt: string
  priceNum: number
}): RuntimeTask {
  const t: RuntimeTask = {
    ...meta,
    status: 'running',
    startedAt: Date.now(),
    finishedAt: 0,
    log: '',
    tokens: 0,
    cost: 0,
    ok: false,
  }
  tasks.set(meta.taskId, t)
  // 落一条 running 记录，便于崩溃后仍可查询历史
  try {
    db.prepare(
      `INSERT INTO node_tasks (id, node_id, owner_user_id, caller_user_id, item_id, vendor, agent, prompt, status, log, tokens, cost, created, finished)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'running', '', 0, 0, ?, 0)`
    ).run(meta.taskId, meta.nodeId, meta.ownerUserId, meta.callerUserId, meta.itemId, meta.vendor, meta.agent, meta.prompt, now())
  } catch (e) {
    console.error('[runtime] 写入任务记录失败:', (e as Error).message)
  }
  return t
}

/** 追加流式进度（节点回传），并推送 SSE */
export function appendTaskProgress(taskId: string, delta: string): void {
  const t = tasks.get(taskId)
  if (!t) return
  t.log += delta
  if (t.log.length > 2_000_000) t.log = t.log.slice(-2_000_000) // 防爆
  push(taskId, 'progress', { ts: Date.now(), delta })
}

/** 完成：结算费用、落库、推送 SSE result */
export function finishRuntimeTask(
  taskId: string,
  result: { ok: boolean; output?: string; tokens?: number; cost?: number }
): void {
  const t = tasks.get(taskId)
  if (!t || t.status !== 'running') return
  t.status = result.ok ? 'done' : 'failed'
  t.finishedAt = Date.now()
  t.ok = result.ok
  if (result.output) t.log += result.output
  t.tokens = result.tokens || 0

  // 计费：优先按节点上报 cost，否则按预估兜底（与旧逻辑一致）
  const estimated = t.priceNum >= 1 ? t.priceNum / 100 : t.priceNum * 18
  t.cost = (result.cost && result.cost > 0) ? Math.round(result.cost * 100) / 100 : Math.max(0.05, Math.round(estimated * 100) / 100)

  if (t.ok) {
    spend(t.callerUserId, t.cost, t.agent)
    try {
      db.prepare(`UPDATE marketplace SET orders = orders + 1 WHERE id = ?`).run(t.itemId)
    } catch {
      /* 物品可能已下架 */
    }
  }

  // 落库（历史查询）
  try {
    db.prepare(
      `UPDATE node_tasks SET status = ?, log = ?, tokens = ?, cost = ?, finished = ? WHERE id = ?`
    ).run(t.status, t.log.slice(0, 400_000), t.tokens, t.cost, t.finishedAt, taskId)
  } catch (e) {
    console.error('[runtime] 更新任务记录失败:', (e as Error).message)
  }

  push(taskId, 'result', {
    ok: t.ok,
    status: t.status,
    output: t.log,
    tokens: t.tokens,
    cost: t.cost,
    finishedAt: t.finishedAt,
  })
  closeSubs(taskId)
}

/** 节点掉线/其他原因直接置为失败 */
export function failRuntimeTask(taskId: string, message: string): void {
  const t = tasks.get(taskId)
  if (!t || t.status !== 'running') return
  t.status = 'failed'
  t.finishedAt = Date.now()
  t.log += `\n[系统] ${message}\n`
  try {
    db.prepare(`UPDATE node_tasks SET status = 'failed', log = ?, finished = ? WHERE id = ?`).run(t.log.slice(0, 400_000), t.finishedAt, taskId)
  } catch {
    /* 忽略 */
  }
  push(taskId, 'fail', { message, finishedAt: t.finishedAt })
  closeSubs(taskId)
}

/** 节点离线时中断其全部运行中任务 */
export function failNodeTasks(nodeId: string, message: string): void {
  for (const t of tasks.values()) {
    if (t.nodeId === nodeId && t.status === 'running') failRuntimeTask(t.taskId, message)
  }
}

/* ---------- 查询 ---------- */

export function getRuntimeTask(taskId: string): RuntimeTask | undefined {
  return tasks.get(taskId)
}

/** 内存优先，其次回源 DB（任务完成后仍可查询） */
export function findTaskById(taskId: string): RuntimeTask | undefined {
  const t = tasks.get(taskId)
  if (t) return t
  const row = db.prepare(`SELECT * FROM node_tasks WHERE id = ?`).get(taskId) as Record<string, unknown> | undefined
  return row ? rowToTask(row) : undefined
}

/** 调用方 A：任务中心/详情 */
export function listCallerTasks(userId: string, limit = 50): RuntimeTask[] {
  const mem = [...tasks.values()].filter((t) => t.callerUserId === userId && t.status === 'running')
  const rows = db
    .prepare(`SELECT * FROM node_tasks WHERE caller_user_id = ? ORDER BY created DESC LIMIT ?`)
    .all(userId, limit) as Record<string, unknown>[]
  const dbTasks = rows.map(rowToTask).filter(Boolean) as RuntimeTask[]
  const dedup = new Set<string>()
  return [...dbTasks, ...mem]
    .filter((t) => (dedup.has(t.taskId) ? false : (dedup.add(t.taskId), true)))
    .slice(0, limit)
}

/** 节点归属方 B：本节点执行记录 */
export function listNodeTasks(userId: string, limit = 50): RuntimeTask[] {
  const mem = [...tasks.values()].filter((t) => t.ownerUserId === userId && t.status === 'running')
  const rows = db
    .prepare(`SELECT * FROM node_tasks WHERE owner_user_id = ? ORDER BY created DESC LIMIT ?`)
    .all(userId, limit) as Record<string, unknown>[]
  const dbTasks = rows.map(rowToTask).filter(Boolean) as RuntimeTask[]
  const dedup = new Set<string>()
  return [...dbTasks, ...mem]
    .filter((t) => (dedup.has(t.taskId) ? false : (dedup.add(t.taskId), true)))
    .slice(0, limit)
}

function rowToTask(r: Record<string, unknown>): RuntimeTask {
  return {
    taskId: r.id as string,
    nodeId: (r.node_id as string) || '',
    ownerUserId: (r.owner_user_id as string) || '',
    callerUserId: (r.caller_user_id as string) || '',
    itemId: (r.item_id as string) || '',
    vendor: (r.vendor as string) || '',
    agent: (r.agent as string) || '',
    prompt: (r.prompt as string) || '',
    priceNum: 0,
    status: (r.status as RuntimeStatus) || 'failed',
    startedAt: (r.created as number) || 0,
    finishedAt: (r.finished as number) || 0,
    log: (r.log as string) || '',
    tokens: (r.tokens as number) || 0,
    cost: (r.cost as number) || 0,
    ok: (r.status as string) === 'done',
  }
}

/* ---------- SSE ---------- */

/** 订阅任务事件流（route 层已做权限校验）。任务未运行时补发最终结果并立即关闭。 */
export function subscribeTask(taskId: string, res: ServerResponse, currentTask?: RuntimeTask): () => void {
  const t = currentTask || tasks.get(taskId)
  const finished = t && t.status !== 'running'

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  res.write('retry: 2000\n\n')

  if (t && finished) {
    // 已结束：补发最终结果后关闭
    res.write(
      `event: result\ndata: ${JSON.stringify({
        ok: t.ok,
        status: t.status,
        output: t.log,
        tokens: t.tokens,
        cost: t.cost,
        finishedAt: t.finishedAt,
      })}\n\n`
    )
    res.end()
    return () => {}
  }

  if (t && t.log) {
    // 运行中：先补发已积累的日志快照
    res.write(`event: progress\ndata: ${JSON.stringify({ ts: Date.now(), delta: t.log })}\n\n`)
  }

  const set = subs.get(taskId) || new Set<ServerResponse>()
  set.add(res)
  subs.set(taskId, set)

  // 心跳，防止前端 EventSource 超时重连
  const hb = setInterval(() => {
    try {
      res.write(': ping\n\n')
    } catch {
      clearInterval(hb)
    }
  }, 15000)

  const cleanup = () => {
    clearInterval(hb)
    const s = subs.get(taskId)
    if (s) {
      s.delete(res)
      if (s.size === 0) subs.delete(taskId)
    }
  }
  res.on('close', cleanup)
  return cleanup
}

function push(taskId: string, event: 'progress' | 'result' | 'fail', data: unknown): void {
  const s = subs.get(taskId)
  if (!s || s.size === 0) return
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  for (const res of s) {
    try {
      res.write(payload)
    } catch {
      s.delete(res)
    }
  }
}

function closeSubs(taskId: string): void {
  const s = subs.get(taskId)
  if (!s) return
  for (const res of s) {
    try {
      res.end()
    } catch {
      /* 忽略 */
    }
  }
  subs.delete(taskId)
}