/* E2E: A 用户接管 B 电脑上的 AGENT
 * 用法：
 *   node e2e-takeover.mjs setup   —— 注册 B/A、B 发布节点+上架 Agent、A 充值，写入 e2e-state.json
 *   node e2e-takeover.mjs call    —— A 调用 B 的 Agent，验证结果来自 B 电脑
 */
import { writeFileSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const BASE = 'http://localhost:4000'
const STATE = fileURLToPath(new URL('./e2e-state.json', import.meta.url))
const mode = process.argv[2] || 'setup'

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

let failures = 0
function check(name, cond, extra = '') {
  console.log(`${cond ? '✅' : '❌'} ${name}${extra ? ' — ' + extra : ''}`)
  if (!cond) failures++
}

if (mode === 'setup') {
  const suffix = Date.now().toString().slice(-8)
  try {
    const regB = await api('/api/auth/register', { method: 'POST', body: { name: 'B用户', email: `b${suffix}@test.com`, password: 'pass123' } })
    check('B 注册成功', !!regB.token && !!regB.user?.id, `userId=${regB.user?.id}`)
    const tokenB = regB.token
    const bUserId = regB.user.id

    const node = await api('/api/profile/node', { method: 'PUT', token: tokenB, body: { name: 'B的电脑', published: true, agents: ['Codex'], visibility: 'public' } })
    check('B 发布节点成功（返回 id 与 token）', !!node.id && !!node.token, `nodeId=${node.id}`)

    const item = await api('/api/market', {
      method: 'POST', token: tokenB,
      body: { cat: 'code', name: 'Codex节点', vendor: 'B用户', priceNum: 10, price: '¥0.10/次', tags: ['codex'], models: ['Codex'], desc: 'B电脑上的 Codex', nodeId: node.id },
    })
    check('B 上架市场 Agent 成功并绑定节点', !!item.id && item.nodeId === node.id)

    const regA = await api('/api/auth/register', { method: 'POST', body: { name: 'A用户', email: `a${suffix}@test.com`, password: 'pass123' } })
    check('A 注册成功', !!regA.token)
    const tokenA = regA.token

    const w = await api('/api/wallet/recharge', { method: 'POST', token: tokenA, body: { amount: 50, method: '微信' } })
    check('A 充值成功（返回 {wallet, billing}）', w.wallet?.balance >= 50, `balance=${w.wallet?.balance}`)

    const state = { tokenB, bUserId, nodeId: node.id, nodeToken: node.token, tokenA, itemId: item.id }
    writeFileSync(STATE, JSON.stringify(state, null, 2))
    console.log('\nSTATE_WRITTEN\n' + JSON.stringify(state))
  } catch (e) {
    console.error('💥 setup 异常:', e.message)
    failures++
  }
} else if (mode === 'call') {
  const state = JSON.parse(readFileSync(STATE, 'utf8'))
  try {
    console.log('   ── A 调用 B 的 Agent（异步下发 + SSE 实时进度） ──')
    const r = await api(`/api/market/${state.itemId}/call`, { method: 'POST', token: state.tokenA, body: { prompt: '帮我写一个 hello world' } })
    check('A 调用下发成功（立即返回 taskId）', !!r.taskId && r.status === 'running', `taskId=${r.taskId}`)

    // 轮询任务详情直到结束
    const taskId = r.taskId
    let task = null
    const start = Date.now()
    for (let i = 0; i < 120; i++) {
      await new Promise((s) => setTimeout(s, 500))
      task = await api(`/api/tasks/runtime/${taskId}`, { token: state.tokenA })
      if (task.status !== 'running') break
    }
    const elapsed = Date.now() - start
    check('任务完成（status=done）', task?.status === 'done', `耗时=${elapsed}ms`)
    check('执行日志来自 B 电脑的节点代理', (task?.log || '').includes('收到来自「A用户」') || (task?.log || '').includes('已接收来自「A用户」'))
    console.log('   日志尾部:', (task.log || '').split('\n').slice(-3).join(' | '))

    // SSE 订阅验证：能收到 progress（或至少 result）
    const sseOk = await new Promise((resolve) => {
      const ctrl = new AbortController()
      const timer = setTimeout(() => { ctrl.abort(); resolve(false) }, 10000)
      fetch(`${BASE}/api/tasks/runtime/${taskId}/events?token=${encodeURIComponent(state.tokenA)}`)
        .then(async (res) => {
          const reader = res.body.getReader()
          const dec = new TextDecoder()
          let buf = ''
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buf += dec.decode(value, { stream: true })
            if (buf.includes('event: result')) { clearTimeout(timer); resolve(true); break }
            if (buf.includes('event: fail')) { clearTimeout(timer); resolve(false); break }
          }
          clearTimeout(timer)
          resolve(buf.includes('event: result'))
        })
        .catch(() => { clearTimeout(timer); resolve(false) })
    })
    check('SSE 订阅能收到 result 事件', sseOk)

    // 验证 B 侧在线状态回写 + A 被扣费
    const profB = await api('/api/profile', { token: state.tokenB })
    check('B 主页显示节点在线（connected=true）', profB.node?.connected === true)
    const wA = await api('/api/wallet', { token: state.tokenA })
    check('A 余额已按实际用量扣费', wA.wallet?.balance < 50, `balance=${wA.wallet?.balance}`)

    // B 侧可视化：能看到本节点上的执行记录，并能打开详情
    const bList = await api('/api/tasks/runtime?role=node', { token: state.tokenB })
    check('B 视角能看到本节点执行记录', bList.some((x) => x.taskId === taskId && x.status === 'done'), `共${bList.length}条`)
    const bDetail = await api(`/api/tasks/runtime/${taskId}`, { token: state.tokenB })
    check('B 有权查看任务详情（含日志）', !!bDetail && (bDetail.log || '').length > 0)
  } catch (e) {
    console.error('💥 call 异常:', e.message)
    failures++
  }
}

console.log(failures === 0 ? '\n🎉 全部通过' : `\n⚠️ 有 ${failures} 处失败`)
process.exit(failures === 0 ? 0 : 1)