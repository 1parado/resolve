import { Router } from 'express'
import { z } from 'zod'
import { db } from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'
import { genId, parseJson } from '../utils/index.js'
import { sendTaskToNode, genTaskId, isNodeOnline } from '../ws/index.js'
import { startRuntimeTask } from '../runtime.js'
import type { MarketItem } from '../types/index.js'

const router = Router()
router.use(requireAuth)

const publishSchema = z.object({
  cat: z.enum(['code', 'reason', 'ops', 'content', 'data', 'design']),
  name: z.string().min(1),
  vendor: z.string().optional(),
  vendorGithub: z.string().optional(),
  icon: z.string().optional(),
  accent: z.string().optional(),
  online: z.boolean().optional(),
  rating: z.number().optional(),
  price: z.string().optional(),
  priceNum: z.number().optional(),
  tags: z.array(z.string()).optional(),
  models: z.array(z.string()).optional(),
  desc: z.string().optional(),
  sla: z.string().optional(),
  nodeId: z.string().optional(),
})

const callSchema = z.object({
  prompt: z.string().min(1),
})

function toMarketItem(r: Record<string, unknown>): MarketItem {
  return {
    id: r.id as string,
    cat: r.cat as MarketItem['cat'],
    name: r.name as string,
    vendor: (r.vendor as string) || '',
    vendorGithub: (r.vendor_github as string) || '',
    icon: (r.icon as string) || '',
    accent: (r.accent as string) || '#6366f1',
    online: Boolean(r.online),
    rating: (r.rating as number) || 5,
    orders: (r.orders as number) || 0,
    price: (r.price as string) || '',
    priceNum: (r.price_num as number) || 0,
    tags: parseJson<string[]>(r.tags as string, []),
    models: parseJson<string[]>(r.models as string, []),
    desc: (r.desc as string) || '',
    sla: (r.sla as string) || '',
    featured: Boolean(r.featured),
    nodeId: (r.node_id as string) || '',
  }
}

/** 市场列表 */
router.get('/', (_req, res) => {
  const rows = db.prepare(`SELECT * FROM marketplace ORDER BY featured DESC, orders DESC`).all() as Record<string, unknown>[]
  res.json(rows.map(toMarketItem))
})

/** 调用 Agent（异步：立即返回 taskId，执行进度/结果通过 SSE 实时推送，完成后自动扣费） */
router.post('/:id/call', (req, res) => {
  const parsed = callSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: '缺少 prompt 参数' })
    return
  }
  const item = db.prepare(`SELECT * FROM marketplace WHERE id = ?`).get(req.params.id) as Record<string, unknown> | undefined
  if (!item) {
    res.status(404).json({ error: 'Agent 不存在' })
    return
  }

  // 1. 找到供给方节点
  const nodeId = (item.node_id as string) || ''
  if (!nodeId) {
    res.status(400).json({ error: '该 Agent 未绑定可执行节点' })
    return
  }
  if (!isNodeOnline(nodeId)) {
    res.status(409).json({ error: '供给方节点当前离线，请稍后再试' })
    return
  }

  // 2. 预估费用并预校验余额（实际扣费在任务完成时按真实用量结算）
  const priceNum = (item.price_num as number) || 0
  const estimated = priceNum >= 1 ? priceNum / 100 : priceNum * 18
  const owner = db.prepare(`SELECT id, user_id FROM nodes WHERE id = ?`).get(nodeId) as { id: string; user_id: string } | undefined
  const caller = db.prepare(`SELECT name FROM users WHERE id = ?`).get(req.userId!) as Record<string, unknown> | undefined
  const callerWallet = db.prepare(`SELECT balance FROM wallet WHERE user_id = ?`).get(req.userId!) as { balance: number } | undefined
  if ((callerWallet?.balance ?? 0) < estimated) {
    res.status(400).json({ error: '余额不足，请先充值', estimated })
    return
  }

  // 3. 登记运行时任务并下发到节点
  const taskId = genTaskId()
  startRuntimeTask({
    taskId,
    nodeId,
    ownerUserId: (owner?.user_id as string) || '',
    callerUserId: req.userId!,
    itemId: item.id as string,
    vendor: (item.vendor as string) || '',
    agent: item.name as string,
    prompt: parsed.data.prompt,
    priceNum,
  })
  const delivered = sendTaskToNode(nodeId, {
    taskId,
    agent: item.name as string,
    prompt: parsed.data.prompt,
    callerName: (caller?.name as string) || '匿名用户',
  })
  if (!delivered) {
    res.status(409).json({ error: '任务投递失败，节点连接异常' })
    return
  }

  // 4. 立即返回：A 侧前端用 SSE 订阅 /api/tasks/runtime/:id/events 看实时进度
  res.status(202).json({
    taskId,
    name: item.name,
    status: 'running',
    vendor: item.vendor,
  })
})

/** 上架 Agent */
router.post('/', (req, res) => {
  const parsed = publishSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: '参数不合法', details: parsed.error.flatten() })
    return
  }
  const d = parsed.data
  const id = genId('m_')
  // 绑定节点：优先用传入的 nodeId，否则用当前用户已发布的节点
  let nodeId = d.nodeId || ''
  if (!nodeId) {
    const node = db.prepare(`SELECT id FROM nodes WHERE user_id = ? AND published = 1`).get(req.userId!) as Record<string, unknown> | undefined
    nodeId = (node?.id as string) || ''
  }
  db.prepare(
    `INSERT INTO marketplace (id, user_id, node_id, cat, name, vendor, vendor_github, icon, accent, online, rating, orders, price, price_num, tags, models, desc, sla, featured)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, 0)`
  ).run(
    id,
    req.userId!,
    nodeId,
    d.cat,
    d.name,
    d.vendor ?? '',
    d.vendorGithub ?? '',
    d.icon ?? '',
    d.accent ?? '#6366f1',
    d.online ?? true ? 1 : 0,
    d.rating ?? 5,
    d.price ?? '',
    d.priceNum ?? 0,
    JSON.stringify(d.tags ?? []),
    JSON.stringify(d.models ?? []),
    d.desc ?? '',
    d.sla ?? ''
  )
  const row = db.prepare(`SELECT * FROM marketplace WHERE id = ?`).get(id) as Record<string, unknown>
  res.status(201).json(toMarketItem(row))
})

export default router