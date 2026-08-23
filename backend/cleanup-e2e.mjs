/* 清理 E2E 测试数据（email 以 @test.com 结尾的用户及其关联数据）。在 backend 目录下运行：node cleanup-e2e.mjs */
import Database from 'better-sqlite3'
import { fileURLToPath } from 'node:url'

const dbPath = fileURLToPath(new URL('./data/resolve.db', import.meta.url))
const db = new Database(dbPath)

const users = db.prepare(`SELECT id FROM users WHERE email LIKE '%@test.com'`).all()
const ids = users.map((u) => u.id)
console.log('待清理测试用户:', ids.length)

if (ids.length) {
  const ph = ids.map(() => '?').join(',')
  db.prepare(`DELETE FROM billing WHERE user_id IN (${ph})`).run(...ids)
  db.prepare(`DELETE FROM wallet WHERE user_id IN (${ph})`).run(...ids)
  db.prepare(`DELETE FROM tasks WHERE user_id IN (${ph})`).run(...ids)
  db.prepare(`DELETE FROM node_tasks WHERE owner_user_id IN (${ph}) OR caller_user_id IN (${ph})`).run(...ids, ...ids)
  const market = db.prepare(`SELECT id FROM marketplace WHERE user_id IN (${ph})`).all(...ids)
  db.prepare(`DELETE FROM marketplace WHERE user_id IN (${ph})`).run(...ids)
  db.prepare(`DELETE FROM agents WHERE user_id IN (${ph})`).run(...ids)
  db.prepare(`DELETE FROM nodes WHERE user_id IN (${ph})`).run(...ids)
  db.prepare(`DELETE FROM enterprise_members WHERE user_id IN (${ph})`).run(...ids)
  const ents = db.prepare(`SELECT id FROM enterprises WHERE owner_id IN (${ph})`).all(...ids)
  for (const e of ents) {
    db.prepare(`DELETE FROM enterprise_logs WHERE enterprise_id = ?`).run(e.id)
  }
  db.prepare(`DELETE FROM enterprises WHERE owner_id IN (${ph})`).run(...ids)
  db.prepare(`DELETE FROM users WHERE id IN (${ph})`).run(...ids)
  console.log('已清理:', ids.length, '用户,', market.length, '个市场条目')
} else {
  console.log('无测试数据')
}
db.close()

// 顺带清理 e2e 状态文件
import { rmSync } from 'node:fs'
try { rmSync(new URL('./e2e-state.json', import.meta.url)) } catch { /* 不存在则忽略 */ }