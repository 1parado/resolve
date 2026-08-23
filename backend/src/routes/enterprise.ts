import { Router } from 'express'
import { z } from 'zod'
import { db } from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'
import { genId, now, parseJson } from '../utils/index.js'
import type { Enterprise, Member, MemberRole } from '../types/index.js'

const router = Router()
router.use(requireAuth)

const callSchema = z.object({
  agent: z.string().min(1),
  prompt: z.string().min(1),
})

const settingSchema = z.object({
  key: z.string().min(1),
  value: z.union([z.boolean(), z.string()]),
})

const basicSchema = z.object({
  name: z.string().optional(),
  seats: z.number().optional(),
})

const memberSchema = z.object({
  name: z.string().optional(),
  job: z.string().optional(),
  os: z.enum(['apple', 'windows', 'linux']).optional(),
  role: z.enum(['管理员', '成员']).optional(),
  online: z.boolean().optional(),
})

/** 获取当前用户所属企业（无则返回空壳） */
function getEnt(userId: string): Enterprise {
  const ent = db.prepare(`SELECT * FROM enterprises WHERE owner_id = ?`).get(userId) as Record<string, unknown> | undefined
  if (!ent) {
    return { name: '', seats: 0, members: [], resources: [], usage: { monthCalls: 0, monthTokens: '0', monthFee: 0 }, logs: [], settings: {} }
  }
  const members = (db.prepare(`SELECT * FROM enterprise_members WHERE enterprise_id = ?`).all(ent.id) as Record<string, unknown>[]).map(
    (m): Member => ({
      id: m.id as string,
      name: m.name as string,
      job: (m.job as string) || '',
      os: (m.os as Member['os']) || 'linux',
      role: (m.role as MemberRole) || '成员',
      online: Boolean(m.online),
      avatar: (m.avatar as string) || '',
      agents: parseJson<string[]>(m.agents as string, []),
      models: parseJson<string[]>(m.models as string, []),
    })
  )
  const logs = (db.prepare(`SELECT * FROM enterprise_logs WHERE enterprise_id = ? ORDER BY time DESC`).all(ent.id) as Record<string, unknown>[]).map(
    (l) => ({
      time: l.time as number,
      who: (l.who as string) || '',
      action: (l.action as string) || '',
      result: (l.result as string) || '',
      type: (l.type as string) || '',
    })
  )
  const settings = parseJson<Record<string, boolean | string>>(ent.settings as string, {})
  return {
    name: ent.name as string,
    seats: (ent.seats as number) || 0,
    members,
    resources: [],
    usage: { monthCalls: 0, monthTokens: '0', monthFee: 0 },
    logs,
    settings,
  }
}

/** 企业信息 */
router.get('/', (req, res) => {
  res.json(getEnt(req.userId!))
})

/** 调用成员 Agent */
router.post('/members/:memberId/call', (req, res) => {
  const parsed = callSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: '参数不合法' })
    return
  }
  const ent = db.prepare(`SELECT * FROM enterprises WHERE owner_id = ?`).get(req.userId!) as Record<string, unknown> | undefined
  if (!ent) {
    res.status(404).json({ error: '尚未创建企业' })
    return
  }
  const member = db.prepare(`SELECT * FROM enterprise_members WHERE id = ? AND enterprise_id = ?`).get(req.params.memberId, ent.id) as Record<string, unknown> | undefined
  const cost = Math.round((2 + Math.random() * 6) * 100) / 100
  db.prepare(
    `INSERT INTO enterprise_logs (id, enterprise_id, time, who, action, result, type) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(genId('el_'), ent.id, now(), (member?.name as string) || req.params.memberId, '调用 ' + parsed.data.agent, '成功 · ¥' + cost.toFixed(2), 'call')
  res.json({ cost })
})

/** 更新设置 */
router.post('/settings', (req, res) => {
  const parsed = settingSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: '参数不合法' })
    return
  }
  const ent = db.prepare(`SELECT * FROM enterprises WHERE owner_id = ?`).get(req.userId!) as Record<string, unknown> | undefined
  if (!ent) {
    res.status(404).json({ error: '尚未创建企业' })
    return
  }
  const settings = parseJson<Record<string, boolean | string>>(ent.settings as string, {})
  settings[parsed.data.key] = parsed.data.value
  db.prepare(`UPDATE enterprises SET settings = ? WHERE id = ?`).run(JSON.stringify(settings), ent.id)
  res.json(settings)
})

/** 更新基本信息 */
router.patch('/', (req, res) => {
  const parsed = basicSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: '参数不合法' })
    return
  }
  const ent = db.prepare(`SELECT * FROM enterprises WHERE owner_id = ?`).get(req.userId!) as Record<string, unknown> | undefined
  if (!ent) {
    res.status(404).json({ error: '尚未创建企业' })
    return
  }
  const fields: string[] = []
  const values: unknown[] = []
  if (parsed.data.name !== undefined) {
    fields.push('name = ?')
    values.push(parsed.data.name)
  }
  if (parsed.data.seats !== undefined) {
    fields.push('seats = ?')
    values.push(parsed.data.seats)
  }
  if (fields.length) {
    values.push(ent.id)
    db.prepare(`UPDATE enterprises SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  }
  const updated = db.prepare(`SELECT * FROM enterprises WHERE id = ?`).get(ent.id) as Record<string, unknown>
  res.json({ name: updated.name, seats: updated.seats })
})

/** 更新成员 */
router.patch('/members/:id', (req, res) => {
  const parsed = memberSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: '参数不合法' })
    return
  }
  const ent = db.prepare(`SELECT * FROM enterprises WHERE owner_id = ?`).get(req.userId!) as Record<string, unknown> | undefined
  if (!ent) {
    res.status(404).json({ error: '尚未创建企业' })
    return
  }
  const fields: string[] = []
  const values: unknown[] = []
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) {
      fields.push(`${k} = ?`)
      values.push(typeof v === 'boolean' ? (v ? 1 : 0) : v)
    }
  }
  if (fields.length) {
    values.push(req.params.id, ent.id)
    db.prepare(`UPDATE enterprise_members SET ${fields.join(', ')} WHERE id = ? AND enterprise_id = ?`).run(...values)
  }
  const row = db.prepare(`SELECT * FROM enterprise_members WHERE id = ? AND enterprise_id = ?`).get(req.params.id, ent.id) as Record<string, unknown> | undefined
  if (!row) {
    res.status(404).json({ error: '成员不存在' })
    return
  }
  res.json({
    id: row.id,
    name: row.name,
    job: row.job,
    os: row.os,
    role: row.role,
    online: Boolean(row.online),
    avatar: row.avatar,
    agents: parseJson<string[]>(row.agents as string, []),
    models: parseJson<string[]>(row.models as string, []),
  })
})

/** 设置成员角色 */
router.post('/members/:id/role', (req, res) => {
  const role = req.body?.role as MemberRole | undefined
  if (role !== '管理员' && role !== '成员') {
    res.status(400).json({ error: '角色不合法' })
    return
  }
  const ent = db.prepare(`SELECT * FROM enterprises WHERE owner_id = ?`).get(req.userId!) as Record<string, unknown> | undefined
  if (!ent) {
    res.status(404).json({ error: '尚未创建企业' })
    return
  }
  db.prepare(`UPDATE enterprise_members SET role = ? WHERE id = ? AND enterprise_id = ?`).run(role, req.params.id, ent.id)
  const row = db.prepare(`SELECT * FROM enterprise_members WHERE id = ? AND enterprise_id = ?`).get(req.params.id, ent.id) as Record<string, unknown> | undefined
  if (!row) {
    res.status(404).json({ error: '成员不存在' })
    return
  }
  res.json({ id: row.id, name: row.name, role: row.role })
})

/** 移除成员 */
router.delete('/members/:id', (req, res) => {
  const ent = db.prepare(`SELECT * FROM enterprises WHERE owner_id = ?`).get(req.userId!) as Record<string, unknown> | undefined
  if (!ent) {
    res.status(404).json({ error: '尚未创建企业' })
    return
  }
  db.prepare(`DELETE FROM enterprise_members WHERE id = ? AND enterprise_id = ?`).run(req.params.id, ent.id)
  res.json({ ok: true })
})

export default router