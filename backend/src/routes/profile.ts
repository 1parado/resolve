import { Router } from 'express'
import { z } from 'zod'
import { randomBytes } from 'node:crypto'
import { db } from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'
import { genId, now, parseJson, genHeatmap } from '../utils/index.js'
import { isNodeOnline, requestNodeScan } from '../ws/index.js'
import type { Agent, NodeInfo, Profile } from '../types/index.js'

const router = Router()
router.use(requireAuth)

const profileSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  github: z.string().optional(),
  job: z.string().optional(),
  os: z.enum(['apple', 'windows', 'linux']).optional(),
  bio: z.string().optional(),
})

const nodeSchema = z.object({
  connected: z.boolean().optional(),
  name: z.string().optional(),
  ip: z.string().optional(),
  port: z.string().optional(),
  runtime: z.string().optional(),
  os: z.string().optional(),
  visibility: z.enum(['public', 'enterprise']).optional(),
  agents: z.array(z.string()).optional(),
  published: z.boolean().optional(),
})

function getProfile(userId: string): Profile {
  const u = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId) as Record<string, unknown>
  return {
    name: u.name as string,
    github: (u.github as string) || '',
    job: (u.job as string) || '',
    os: (u.os as Profile['os']) || 'linux',
    bio: (u.bio as string) || '',
    joined: new Date(u.joined as number).toISOString().slice(0, 10),
  }
}

function getAgents(userId: string): Agent[] {
  const rows = db.prepare(`SELECT * FROM agents WHERE user_id = ?`).all(userId) as Record<string, unknown>[]
  return rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    product: (r.product as string) || '',
    icon: (r.icon as string) || '',
    status: (r.status as Agent['status']) || 'offline',
    accent: (r.accent as string) || '#6366f1',
    models: parseJson<string[]>(r.models as string, []),
    price: (r.price as string) || '',
    unit: (r.unit as string) || '',
    tags: parseJson<string[]>(r.tags as string, []),
    desc: (r.desc as string) || '',
  }))
}

function getNode(userId: string): NodeInfo {
  const n = db.prepare(`SELECT * FROM nodes WHERE user_id = ?`).get(userId) as Record<string, unknown> | undefined
  if (!n) {
    return { id: '', connected: false, name: '', ip: '', port: '', runtime: '', os: 'linux', visibility: 'public', agents: [], published: false, agentsInfo: [] }
  }
  return {
    id: n.id as string,
    connected: Boolean(n.connected),
    name: (n.name as string) || '',
    ip: (n.ip as string) || '',
    port: (n.port as string) || '',
    runtime: (n.runtime as string) || '',
    os: (n.os as string) || 'linux',
    visibility: (n.visibility as NodeInfo['visibility']) || 'public',
    agents: parseJson<string[]>(n.agents as string, []),
    published: Boolean(n.published),
    token: (n.token as string) || '',
    agentsInfo: parseJson<NodeInfo['agentsInfo']>(n.agents_info as string, []),
  }
}

function getStats(userId: string) {
  const billing = db.prepare(`SELECT * FROM billing WHERE user_id = ?`).all(userId) as Record<string, unknown>[]
  const calls = billing.filter((b) => b.type === 'call')
  const total = calls.length
  const today = calls.filter((b) => (b.time as number) > now() - 86400000).length
  const week = calls.filter((b) => (b.time as number) > now() - 7 * 86400000).length
  const revenue = calls.reduce((s, b) => s + (b.amount as number), 0)
  return {
    today,
    week,
    total,
    monthVolume: revenue,
    revenue,
    onlineHours: 0,
    successRate: total ? Math.round((calls.filter((b) => b.status === 'success').length / total) * 100) : 100,
  }
}

/** 获取个人主页完整数据 */
router.get('/', (req, res) => {
  const userId = req.userId!
  res.json({
    profile: getProfile(userId),
    agents: getAgents(userId),
    node: getNode(userId),
    stats: getStats(userId),
    heatmap: genHeatmap(),
  })
})

/** 更新资料 */
router.patch('/', (req, res) => {
  const parsed = profileSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: '参数不合法' })
    return
  }
  const userId = req.userId!
  const patch = parsed.data
  const fields: string[] = []
  const values: unknown[] = []
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) {
      fields.push(`${k} = ?`)
      values.push(v)
    }
  }
  if (fields.length) {
    values.push(userId)
    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  }
  res.json(getProfile(userId))
})

/** 发布/更新节点 */
router.put('/node', (req, res) => {
  const parsed = nodeSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: '参数不合法' })
    return
  }
  const userId = req.userId!
  const patch = parsed.data
  const fields: string[] = []
  const values: unknown[] = []
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) {
      fields.push(`${k} = ?`)
      values.push(typeof v === 'boolean' ? (v ? 1 : 0) : Array.isArray(v) ? JSON.stringify(v) : v)
    }
  }
  // 首次发布时生成节点 token（供节点代理连接认证）
  const existing = db.prepare(`SELECT token FROM nodes WHERE user_id = ?`).get(userId) as Record<string, unknown> | undefined
  if (!existing?.token) {
    fields.push('token = ?')
    values.push('nt_' + randomBytes(24).toString('hex'))
  }
  if (fields.length) {
    values.push(userId)
    db.prepare(`UPDATE nodes SET ${fields.join(', ')} WHERE user_id = ?`).run(...values)
  }
  res.json(getNode(userId))
})

/** 请求本机节点重新扫描 Agent（节点代理收到后回传 agents_snapshot，前端轮询 profile 刷新） */
router.post('/node/scan', (req, res) => {
  const n = getNode(req.userId!)
  if (!n.id || !isNodeOnline(n.id)) {
    res.status(409).json({ error: '节点未上线，请先在本机运行节点代理' })
    return
  }
  if (!requestNodeScan(n.id)) {
    res.status(409).json({ error: '节点连接异常，请稍后再试' })
    return
  }
  res.json({ ok: true })
})

/** 账单流水 */
router.get('/billing', (req, res) => {
  const userId = req.userId!
  const top = Number(req.query.top) || 0
  const rows = db
    .prepare(`SELECT * FROM billing WHERE user_id = ? ORDER BY time DESC`)
    .all(userId) as Record<string, unknown>[]
  const list = rows.map((r) => ({
    id: r.id as string,
    time: r.time as number,
    type: r.type as string,
    agent: (r.agent as string) || '',
    amount: r.amount as number,
    status: (r.status as string) || 'success',
    method: (r.method as string) || '',
  }))
  res.json(top ? list.slice(0, top) : list)
})

export default router