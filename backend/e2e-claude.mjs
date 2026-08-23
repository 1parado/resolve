/* 真实 Claude 验证：B 上架 Claude Agent → A 调用 → 实时 SSE 看真实执行输出并完成 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const BASE = 'http://localhost:4000'
const STATE = fileURLToPath(new URL('./e2e-state.json', import.meta.url))
const state = JSON.parse(readFileSync(STATE, 'utf8'))

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

// 1. B 上架一个绑定到本节点的 Claude Agent
const item = await api('/api/market', {
  method: 'POST', token: state.tokenB,
  body: { cat: 'code', name: 'Claude 终端', vendor: 'B用户', priceNum: 5, price: '¥0.05/次', tags: ['claude', '终端'], models: ['claude'], desc: 'B 电脑上的本地 Claude', nodeId: state.nodeId },
})
check('B 上架 Claude Agent 成功', !!item.id && item.nodeId === state.nodeId)

const prompt = '用一句话介绍 Vue.js，并说明它的核心特性。'
console.log('\n   ── A 调用 B 电脑上的真实 Claude ──')
const r = await api(`/api/market/${item.id}/call`, { method: 'POST', token: state.tokenA, body: { prompt } })
check('任务下发成功', !!r.taskId, `taskId=${r.taskId}`)
const taskId = r.taskId

// 2. 实时 SSE：收集 progress，等 result
let progressCount = 0
let firstProgress = ''
let sawResult = false
let resultPayload = null
const sseDone = new Promise((resolve) => {
  fetch(`${BASE}/api/tasks/runtime/${taskId}/events?token=${encodeURIComponent(state.tokenA)}`).then(async (res) => {
    const reader = res.body.getReader()
    const dec = new TextDecoder()
    let buf = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += dec.decode(value, { stream: true })
      let idx
      while ((idx = buf.indexOf('\n\n')) >= 0) {
        const ev = buf.slice(0, idx)
        buf = buf.slice(idx + 2)
        if (ev.startsWith('event: progress')) {
          progressCount++
          const m = ev.match(/data: (.*)/)
          if (m && !firstProgress) firstProgress = m[1]
        } else if (ev.startsWith('event: result')) {
          sawResult = true
          const m = ev.match(/data: (.*)/)
          if (m) { try { resultPayload = JSON.parse(m[1]) } catch { /* */ } }
          resolve()
          return
        }
      }
    }
    resolve()
  }).catch(() => resolve())
  setTimeout(() => resolve(), 90000)
})
await sseDone
check('SSE 实时收到 progress（输出产生即回传）', progressCount >= 2 && sawResult, `progress×${progressCount}`)
if (firstProgress) console.log('   首条进度:', firstProgress.slice(0, 140))

// 3. 轮询最终结果
let task = null
for (let i = 0; i < 200; i++) {
  await new Promise((s) => setTimeout(s, 500))
  task = await api(`/api/tasks/runtime/${taskId}`, { token: state.tokenA })
  if (task.status !== 'running') break
}
check('真实 Claude 任务完成', task?.status === 'done', `耗时=${(task.finishedAt || 0) - task.startedAt}ms tokens=${task.tokens} cost=${task.cost}`)
check('输出为 Claude 真实回复（非 mock）', !(task?.log || '').includes('EXEC_MODE=mock') && (task?.log || '').trim().length > 20)
console.log('\n   ── 真实 Claude 输出（节选） ──')
console.log((task?.log || '').slice(0, 500))

console.log(failures === 0 ? '\n🎉 真实 Claude 接管验证通过' : `\n⚠️ 有 ${failures} 处失败`)
process.exit(failures === 0 ? 0 : 1)