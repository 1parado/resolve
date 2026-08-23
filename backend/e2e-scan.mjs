/* 「扫描接入 Agent」功能 E2E：
 * 1) 注册临时 B 并发布节点 → 2) 启动临时 agent（本机自动扫描）
 * 3) GET profile 确认 agentsInfo 来自本机真实扫描
 * 4) POST /node/scan 触发重扫 → 快照回传更新
 * 5) 前端「一键上架」同款 API 发布一个本地 Agent 商品并被 A 调用
 * 6) 清理临时数据
 */
import Database from 'better-sqlite3'
import { spawn } from 'node:child_process'
const BASE = 'http://localhost:4000'
const db = new Database('D:/resolve/backend/data/resolve.db')

const api = async (path, { method = 'GET', body, token } = {}) => {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const text = await res.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = text }
  if (!res.ok) throw new Error(`[${res.status}] ${path} ${text}`)
  return data
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let failures = 0
const check = (name, cond, extra = '') => {
  console.log(`${cond ? '✅' : '❌'} ${name}${extra ? ' — ' + extra : ''}`)
  if (!cond) failures++
}

let agentProc = null
let state = null

/** 清理临时账号（开始前 + finally 都会执行，防残留） */
function clean() {
  try { agentProc?.kill() } catch { /* */ }
  db.pragma('foreign_keys = OFF')
  const emails = ['scan_probe@test.com', 'scan_probe_a@test.com']
  db.prepare('DELETE FROM node_tasks WHERE owner_user_id IN (SELECT id FROM users WHERE email IN (?,?)) OR caller_user_id IN (SELECT id FROM users WHERE email IN (?,?))').run(...emails, ...emails)
  for (const email of emails) {
    const u = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
    if (u) {
      for (const tbl of ['billing', 'wallet', 'tasks', 'marketplace', 'agents', 'nodes']) {
        db.prepare(`DELETE FROM ${tbl} WHERE user_id = ?`).run(u.id)
      }
      db.prepare('DELETE FROM users WHERE id = ?').run(u.id)
      console.log('🧹 清理', email)
    }
  }
}
clean()

try {
  // 1. 临时 B + 发布节点（与 ConnectView 同款参数）
  const regB = await api('/api/auth/register', { method: 'POST', body: { name: '扫描测试B', email: 'scan_probe@test.com', password: 'x1y2z3w4' } })
  const tokenB = regB.token
  const node = await api('/api/profile/node', {
    method: 'PUT', token: tokenB,
    body: { name: '扫描测试节点', ip: '本机', port: '', runtime: 'node-agent · 本地扫描', os: 'windows', visibility: 'public', agents: [], published: true },
  })
  check('发布节点并拿到 nodeId+token', !!node.id && !!node.token, `node=${node.id}`)
  state = { tokenB, bUserId: regB.user.id, nodeId: node.id, nodeToken: node.token }

  // 2. 启动临时 node-agent（扫描会真实执行）
  agentProc = spawn(
    'npx', ['tsx', 'src/index.ts'],
    {
      cwd: 'D:/resolve/backend/node-agent',
      env: {
        ...process.env,
        SERVER_URL: 'ws://localhost:4000/ws',
        NODE_ID: state.nodeId, USER_ID: state.bUserId, TOKEN: state.nodeToken,
        NODE_NAME: '扫描测试节点', EXEC_MODE: 'mock',
      },
      stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, shell: true,
    }
  )
  agentProc.on('error', (err) => console.log('  [agent 进程]', err.message))
  let agentOut = ''
  agentProc.stdout.on('data', (d) => (agentOut += d))
  agentProc.stderr.on('data', (d) => (agentOut += d))

  // 等待上线
  let prof = null
  for (let i = 0; i < 20; i++) {
    await sleep(600)
    prof = await api('/api/profile', { token: tokenB })
    if (prof.node.connected) break
  }
  check('临时节点上线（agent 注册成功）', prof?.node.connected === true)
  check('agent 启动时自动执行了本机扫描', agentOut.includes('本机检测到') || agentOut.includes('检测到'))

  // 3. 扫描结果上报并持久化
  const info = prof.node.agentsInfo || []
  check('profile 返回本机真实扫描结果（≥2 个）', info.length >= 2, `${info.map((a) => a.name).join('/')}`)
  check('扫描结果含 codex 与 claude', info.some((a) => a.id === 'codex') && info.some((a) => a.id === 'claude'))
  check('含可执行路径与版本', info.every((a) => a.path && (a.version || a.authed)))

  // 4. HTTP 触发重新扫描
  const scan = await api('/api/profile/node/scan', { method: 'POST', token: tokenB })
  check('POST /node/scan 下发成功', scan.ok === true)
  await sleep(4000)
  prof = await api('/api/profile', { token: tokenB })
  const info2 = prof.node.agentsInfo || []
  check('重扫后快照回传并更新（仍 ≥2 个）', info2.length >= 2, `${info2.map((a) => a.name).join('/')}`)

  // 5. 一键上架（ConnectView 同款参数）→ 自动绑定节点 → 被 A 调用并完成
  const item = await api('/api/market', {
    method: 'POST', token: tokenB,
    body: {
      cat: 'code', name: `本地 ${info2[0].name}`, vendor: '扫描测试B', vendorGithub: '',
      icon: 'zap', accent: '#10a37f', online: true, rating: 5,
      price: '¥0.05/次', priceNum: 5, tags: [info2[0].id, '本地', '实时'], models: [info2[0].id, 'cli'],
      desc: `扫描测试节点 上的本地 ${info2[0].name}`, sla: '平均响应 1min · 实时流式输出',
    },
  })
  check('一键上架成功且自动绑定已发布节点', !!item.id && item.nodeId === state.nodeId, `item=${item.id}`)

  const regA = await api('/api/auth/register', { method: 'POST', body: { name: '扫描测试A', email: 'scan_probe_a@test.com', password: 'x1y2z3w4' } })
  const tokenA = regA.token
  await api('/api/wallet/recharge', { method: 'POST', token: tokenA, body: { amount: 50, method: '测试充值' } })
  const call = await api(`/api/market/${item.id}/call`, { method: 'POST', token: tokenA, body: { prompt: '打印三行 hello' } })
  let task = null
  for (let i = 0; i < 40; i++) {
    await sleep(500)
    task = await api(`/api/tasks/runtime/${call.taskId}`, { token: tokenA })
    if (task.status !== 'running') break
  }
  check('上架后的本地 Agent 可被 A 真实调用完成', task?.status === 'done', `tokens=${task?.tokens}`)
} catch (e) {
  console.log('💥', e.message)
  failures++
} finally {
  // 6. 清理
  clean()
  db.close()
  console.log('🧹 临时数据已清理')
}

console.log(failures === 0 ? '\n🎉 扫描接入功能验证通过' : `\n⚠️ 有 ${failures} 处失败`)
process.exit(failures === 0 ? 0 : 1)