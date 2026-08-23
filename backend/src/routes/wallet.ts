import { Router } from 'express'
import { z } from 'zod'
import { db } from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'
import { genId, now } from '../utils/index.js'
import type { Wallet } from '../types/index.js'

const router = Router()
router.use(requireAuth)

const rechargeSchema = z.object({
  amount: z.number().positive(),
  method: z.string().min(1),
})

const withdrawSchema = z.object({
  amount: z.number().positive(),
})

function getWallet(userId: string): Wallet {
  const w = db.prepare(`SELECT * FROM wallet WHERE user_id = ?`).get(userId) as Record<string, unknown>
  return { balance: (w.balance as number) || 0, monthCost: (w.month_cost as number) || 0 }
}

function addBilling(userId: string, type: string, agent: string, amount: number, method: string, status = 'success') {
  db.prepare(
    `INSERT INTO billing (id, user_id, time, type, agent, amount, status, method) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(genId('b_'), userId, now(), type, agent, amount, status, method)
}

/** 钱包 + 账单 */
router.get('/', (req, res) => {
  const userId = req.userId!
  const rows = db.prepare(`SELECT * FROM billing WHERE user_id = ? ORDER BY time DESC`).all(userId) as Record<string, unknown>[]
  const billing = rows.map((r) => ({
    id: r.id as string,
    time: r.time as number,
    type: r.type as string,
    agent: (r.agent as string) || '',
    amount: r.amount as number,
    status: (r.status as string) || 'success',
    method: (r.method as string) || '',
  }))
  res.json({ wallet: getWallet(userId), billing })
})

/** 充值 */
router.post('/recharge', (req, res) => {
  const parsed = rechargeSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: '参数不合法' })
    return
  }
  const userId = req.userId!
  const { amount, method } = parsed.data
  db.prepare(`UPDATE wallet SET balance = balance + ? WHERE user_id = ?`).run(amount, userId)
  addBilling(userId, 'recharge', '', amount, method)
  // 与前端 walletApi.recharge 期望的结构对齐：{ wallet, billing }
  res.json({ wallet: getWallet(userId), billing: getBillingList(userId) })
})

/** 提现 */
router.post('/withdraw', (req, res) => {
  const parsed = withdrawSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: '参数不合法' })
    return
  }
  const userId = req.userId!
  const { amount } = parsed.data
  const wallet = getWallet(userId)
  if (wallet.balance < amount) {
    res.status(400).json({ error: '余额不足' })
    return
  }
  db.prepare(`UPDATE wallet SET balance = balance - ? WHERE user_id = ?`).run(amount, userId)
  addBilling(userId, 'withdraw', '', -amount, '提现')
  res.json(getWallet(userId))
})

/** 扣费（内部调用，供市场/任务模块使用） */
export function spend(userId: string, amount: number, agent: string): boolean {
  const wallet = getWallet(userId)
  if (wallet.balance < amount) return false
  db.prepare(`UPDATE wallet SET balance = balance - ?, month_cost = month_cost + ? WHERE user_id = ?`).run(amount, amount, userId)
  addBilling(userId, 'call', agent, -amount, '余额')
  return true
}

function getBillingList(userId: string) {
  const rows = db.prepare(`SELECT * FROM billing WHERE user_id = ? ORDER BY time DESC`).all(userId) as Record<string, unknown>[]
  return rows.map((r) => ({
    id: r.id as string,
    time: r.time as number,
    type: r.type as string,
    agent: (r.agent as string) || '',
    amount: r.amount as number,
    status: (r.status as string) || 'success',
    method: (r.method as string) || '',
  }))
}

export default router