import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { db } from '../db/index.js'
import { signToken, requireAuth } from '../middleware/auth.js'
import { genId, now } from '../utils/index.js'
import type { SessionUser } from '../types/index.js'

const router = Router()

const registerSchema = z.object({
  name: z.string().min(1).max(50),
  email: z.string().email(),
  password: z.string().min(6),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const githubSchema = z.object({
  name: z.string().min(1),
  github: z.string().min(1),
  email: z.string().email().optional(),
})

/** 创建用户（含默认钱包/节点），返回用户行 */
function createUser(input: {
  name: string
  email?: string
  github?: string
  passwordHash?: string
  provider: 'email' | 'github'
  color?: string
}) {
  const id = genId('u_')
  const joined = now()
  db.prepare(
    `INSERT INTO users (id, name, email, github, password_hash, provider, color, joined, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, input.name, input.email ?? null, input.github ?? null, input.passwordHash ?? null, input.provider, input.color ?? null, joined, joined)

  db.prepare(`INSERT INTO wallet (user_id, balance, month_cost) VALUES (?, 0, 0)`).run(id)
  db.prepare(
    `INSERT INTO nodes (id, user_id, connected, name, ip, port, runtime, os, visibility, published, agents)
     VALUES (?, ?, 0, '', '', '', '', 'linux', 'public', 0, '[]')`
  ).run(genId('n_'), id)

  return db.prepare(`SELECT * FROM users WHERE id = ?`).get(id) as Record<string, unknown>
}

function toSessionUser(row: Record<string, unknown>): SessionUser {
  return {
    id: row.id as string,
    name: row.name as string,
    github: (row.github as string) || undefined,
    email: (row.email as string) || undefined,
    color: (row.color as string) || undefined,
    provider: row.provider as SessionUser['provider'],
  }
}

/** 邮箱注册 */
router.post('/register', (req, res) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: '参数不合法', details: parsed.error.flatten() })
    return
  }
  const { name, email, password } = parsed.data
  const exists = db.prepare(`SELECT id FROM users WHERE email = ?`).get(email)
  if (exists) {
    res.status(409).json({ error: '该邮箱已注册' })
    return
  }
  const passwordHash = bcrypt.hashSync(password, 10)
  const user = createUser({ name, email, provider: 'email', passwordHash })
  const token = signToken(user.id as string)
  res.status(201).json({ token, user: toSessionUser(user) })
})

/** 邮箱登录 */
router.post('/login', (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: '参数不合法' })
    return
  }
  const { email, password } = parsed.data
  const user = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email) as Record<string, unknown> | undefined
  if (!user) {
    res.status(404).json({ error: '账号不存在' })
    return
  }
  if (!user.password_hash || !bcrypt.compareSync(password, user.password_hash as string)) {
    res.status(401).json({ error: '邮箱或密码错误' })
    return
  }
  const token = signToken(user.id as string)
  res.json({ token, user: toSessionUser(user) })
})

/** GitHub OAuth 登录（简化：前端传入 GitHub 用户信息） */
router.post('/oauth/github', (req, res) => {
  const parsed = githubSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: '参数不合法' })
    return
  }
  const { name, github, email } = parsed.data
  let user = db.prepare(`SELECT * FROM users WHERE github = ?`).get(github) as Record<string, unknown> | undefined
  if (!user) {
    user = createUser({ name, github, email, provider: 'github' })
  }
  const token = signToken(user.id as string)
  res.json({ token, user: toSessionUser(user) })
})

/** 当前登录用户 */
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.userId!) as Record<string, unknown> | undefined
  if (!user) {
    res.status(404).json({ error: '用户不存在' })
    return
  }
  res.json({ user: toSessionUser(user) })
})

/** 登录状态 */
router.get('/status', requireAuth, (_req, res) => {
  res.json({ authed: true })
})

export default router