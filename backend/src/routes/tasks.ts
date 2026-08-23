import { Router } from 'express'
import { z } from 'zod'
import jwt from 'jsonwebtoken'
import { db } from '../db/index.js'
import { config } from '../config.js'
import { requireAuth } from '../middleware/auth.js'
import { genId, now } from '../utils/index.js'
import {
  findTaskById,
  getRuntimeTask,
  listCallerTasks,
  listNodeTasks,
  subscribeTask,
} from '../runtime.js'
import type { TaskItem } from '../types/index.js'

const router = Router()

/* ==========================================================================
   运行时任务（市场调用 → 节点执行，实时进度/结果）
   注意：这部分放在 requireAuth 之前，因为 SSE（EventSource）无法带
   Authorization 头，只能走 ?token= 查询参数，因此这里自行解析凭证。
   ========================================================================== */

/** 解析当前用户：兼容 Authorization 头（fetch）与 ?token=（EventSource） */
function resolveUser(req: { headers: { authorization?: string }; query: { token?: string } }): { userId?: string } {
  const header = req.headers?.authorization
  if (header?.startsWith('Bearer ')) {
    try {
      const p = jwt.verify(header.slice(7), config.jwtSecret) as { userId: string }
      return { userId: p.userId }
    } catch {
      return {}
    }
  }
  const token = (req.query?.token as string) || ''
  if (token) {
    try {
      const p = jwt.verify(token, config.jwtSecret) as { userId: string }
      return { userId: p.userId }
    } catch {
      return {}
    }
  }
  return {}
}

/** 任务列表：?role=caller 我发起的调用（A 侧） | ?role=node 我节点上的执行（B 侧） */
router.get('/runtime', (req, res) => {
  const u = resolveUser(req)
  if (!u.userId) {
    res.status(401).json({ error: '未登录' })
    return
  }
  const role = (req.query.role as string) || 'caller'
  const list = role === 'node' ? listNodeTasks(u.userId) : listCallerTasks(u.userId)
  res.json(list)
})

/** 任务详情（A/B 均可查自己相关的任务） */
router.get('/runtime/:id', (req, res) => {
  const u = resolveUser(req)
  if (!u.userId) {
    res.status(401).json({ error: '未登录' })
    return
  }
  const t = findTaskById(req.params.id)
  if (!t) {
    res.status(404).json({ error: '任务不存在' })
    return
  }
  if (t.callerUserId !== u.userId && t.ownerUserId !== u.userId) {
    res.status(403).json({ error: '无权查看该任务' })
    return
  }
  res.json(t)
})

/** 任务实时进度 SSE：event=progress（delta）/ result / fail */
router.get('/runtime/:id/events', (req, res) => {
  const u = resolveUser(req)
  if (!u.userId) {
    res.status(401).json({ error: '未登录' })
    return
  }
  const t = findTaskById(req.params.id)
  if (!t) {
    res.status(404).json({ error: '任务不存在' })
    return
  }
  if (t.callerUserId !== u.userId && t.ownerUserId !== u.userId) {
    res.status(403).json({ error: '无权查看该任务' })
    return
  }
  const live = getRuntimeTask(req.params.id)
  subscribeTask(req.params.id, res, live)
})

/* ============ 任务中心（以下接口均需登录） ============ */
router.use(requireAuth)

const createSchema = z.object({
  title: z.string().min(1),
  agent: z.string().min(1),
  agentIcon: z.string().optional(),
  agentAccent: z.string().optional(),
  type: z.enum(['once', 'schedule']),
  schedule: z.string().optional(),
})

function toTask(r: Record<string, unknown>): TaskItem {
  return {
    id: r.id as string,
    title: r.title as string,
    agent: (r.agent as string) || '',
    agentIcon: (r.agent_icon as string) || '',
    agentAccent: (r.agent_accent as string) || '#6366f1',
    type: (r.type as TaskItem['type']) || 'once',
    status: (r.status as TaskItem['status']) || 'pending',
    progress: (r.progress as number) || 0,
    tokens: (r.tokens as number) || 0,
    cost: (r.cost as number) || 0,
    created: r.created as number,
    schedule: (r.schedule as string) || undefined,
  }
}

/** 任务列表 */
router.get('/', (req, res) => {
  const rows = db.prepare(`SELECT * FROM tasks WHERE user_id = ? ORDER BY created DESC`).all(req.userId!) as Record<string, unknown>[]
  res.json(rows.map(toTask))
})

/** 创建任务 */
router.post('/', (req, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: '参数不合法' })
    return
  }
  const d = parsed.data
  const id = genId('t_')
  db.prepare(
    `INSERT INTO tasks (id, user_id, title, agent, agent_icon, agent_accent, type, status, progress, tokens, cost, created, schedule)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 0, 0, 0, ?, ?)`
  ).run(id, req.userId!, d.title, d.agent, d.agentIcon ?? '', d.agentAccent ?? '#6366f1', d.type, now(), d.schedule ?? null)
  const row = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(id) as Record<string, unknown>
  res.status(201).json(toTask(row))
})

/** 取消任务 */
router.post('/:id/cancel', (req, res) => {
  const r = db.prepare(`UPDATE tasks SET status = 'cancelled' WHERE id = ? AND user_id = ?`).run(req.params.id, req.userId!)
  if (!r.changes) {
    res.status(404).json({ error: '任务不存在' })
    return
  }
  res.json({ ok: true })
})

/** 重跑任务 */
router.post('/:id/rerun', (req, res) => {
  const r = db.prepare(`UPDATE tasks SET status = 'running', progress = 5 WHERE id = ? AND user_id = ?`).run(req.params.id, req.userId!)
  if (!r.changes) {
    res.status(404).json({ error: '任务不存在' })
    return
  }
  res.json({ ok: true })
})

export default router
