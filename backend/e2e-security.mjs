/* 安全验证：只有持有真实节点 token 的 B 才能注册节点上线，陌生人不能冒充 */
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'

const BASE = 'http://localhost:4000'
const WS = 'ws://localhost:4000/ws'

async function api(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const text = await res.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = text }
  if (!res.ok) throw new Error(`[${res.status}] ${path} ${text}`)
  return data
}

function tryRegister(token, nodeId = 'n_whatever', userId = 'u_whatever') {
  return new Promise((resolve) => {
    const ws = new WebSocket(`${WS}?token=${encodeURIComponent(token)}`)
    const timer = setTimeout(() => { try { ws.close() } catch {} resolve('timeout') }, 4000)
    ws.addEventListener('open', () => {
      // 立即发送 register 消息，让服务器做校验
      ws.send(JSON.stringify({ type: 'register', nodeId, userId, token, name: 'x', agents: ['Codex'] }))
    })
    ws.addEventListener('message', (ev) => { clearTimeout(timer); ws.close(); resolve('registered') })
    ws.addEventListener('close', (ev) => { clearTimeout(timer); resolve('closed:' + ev.code) })
    ws.addEventListener('error', () => {})
  })
}

let failures = 0
function check(name, cond, extra = '') {
  console.log(`${cond ? '✅' : '❌'} ${name}${extra ? ' — ' + extra : ''}`)
  if (!cond) failures++
}

const suffix = Date.now().toString().slice(-8)
try {
  // 造一个 B 节点
  const reg = await api('/api/auth/register', { method: 'POST', body: { name: 'B安全测试', email: `sec${suffix}@test.com`, password: 'pass123' } })
  const node = await api('/api/profile/node', { method: 'PUT', token: reg.token, body: { name: 'B的电脑', published: true, agents: ['Codex'] } })

  // 1. 无 token 直接连 → 被拒
  const r1 = await tryRegister('')
  check('无 token 连接被拒绝', r1 === 'closed:4001', r1)

  // 2. 伪造 token 连 → 注册消息无法通过（close 4003）
  const r2 = await tryRegister('nt_FAKE_TOKEN')
  check('伪造 token 无法注册（4003）', r2 === 'closed:4003', r2)

  // 3. 正确 token 但 nodeId 是别人的 → 校验 userId 归属拒绝
  const r3 = await tryRegister(node.token) // 这是对的，下面用错 nodeId
  // 用正确 token 但错误 nodeId 的 register 消息（通过自己建 WS 发错 nodeId）
  const r3b = await new Promise((resolve) => {
    const ws = new WebSocket(`${WS}?token=${encodeURIComponent(node.token)}`)
    const timer = setTimeout(() => { try { ws.close() } catch {} resolve('timeout') }, 4000)
    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({ type: 'register', nodeId: 'n_not_exists', userId: reg.user.id, token: node.token, name: 'x', agents: ['Codex'] }))
    })
    ws.addEventListener('close', (ev) => { clearTimeout(timer); resolve('closed:' + ev.code) })
    ws.addEventListener('message', (ev) => { clearTimeout(timer); ws.close(); resolve('registered:' + ev.data) })
  })
  check('伪造 nodeId 无法注册（4003）', r3b === 'closed:4003', r3b)

  // 4. 正确 token + 正确 nodeId + 正确 userId → 注册成功
  const r4 = await new Promise((resolve) => {
    const ws = new WebSocket(`${WS}?token=${encodeURIComponent(node.token)}`)
    const timer = setTimeout(() => { try { ws.close() } catch {} resolve('timeout') }, 4000)
    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({ type: 'register', nodeId: node.id, userId: reg.user.id, token: node.token, name: 'B的电脑', agents: ['Codex'] }))
    })
    ws.addEventListener('message', (ev) => { clearTimeout(timer); ws.close(); resolve(ev.data) })
    ws.addEventListener('close', () => { clearTimeout(timer); resolve('closed') })
  })
  check('正确凭证注册成功', r4.includes('registered'), r4)
} catch (e) {
  console.error('💥 安全测试异常:', e.message)
  failures++
}

console.log(failures === 0 ? '\n🎉 安全验证通过' : `\n⚠️ 有 ${failures} 处失败`)

// 清理测试数据
const db = new Database(fileURLToPath(new URL('./data/resolve.db', import.meta.url)))
const users = db.prepare(`SELECT id FROM users WHERE email LIKE '%@test.com'`).all()
const ids = users.map((u) => u.id)
if (ids.length) {
  const ph = ids.map(() => '?').join(',')
  db.prepare(`DELETE FROM billing WHERE user_id IN (${ph})`).run(...ids)
  db.prepare(`DELETE FROM wallet WHERE user_id IN (${ph})`).run(...ids)
  db.prepare(`DELETE FROM tasks WHERE user_id IN (${ph})`).run(...ids)
  db.prepare(`DELETE FROM marketplace WHERE user_id IN (${ph})`).run(...ids)
  db.prepare(`DELETE FROM agents WHERE user_id IN (${ph})`).run(...ids)
  db.prepare(`DELETE FROM nodes WHERE user_id IN (${ph})`).run(...ids)
  db.prepare(`DELETE FROM enterprise_members WHERE user_id IN (${ph})`).run(...ids)
  db.prepare(`DELETE FROM users WHERE id IN (${ph})`).run(...ids)
  console.log('已清理测试数据:', ids.length, '用户')
}
db.close()
process.exit(failures === 0 ? 0 : 1)