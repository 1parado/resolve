/* 真实 CLI 验证：A 调用 B 电脑上的 codex，实时 SSE 看执行过程，并确认结果是真实输出 */
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

const prompt = '用中文写一首四行短诗，主题是月亮，并附一句英文翻译。'

// 1. A 调用（node-agent 已切到 EXEC_MODE=cli）
console.log('   ── A 调用 B 电脑上的真实 codex ──')
const r = await api(`/api/market/${state.itemId}/call`, { method: 'POST', token: state.tokenA, body: { prompt } })
check('任务下发成功', !!r.taskId, `taskId=${r.taskId}`)
const taskId = r.taskId

// 2. 立即打开 SSE，实时收进度（重点：result 之前应有 progress）
let progressCount = 0
let firstProgress = ''
let sawResult = false
const sse = await new Promise((resolve, reject) => {
  fetch(`${BASE}/api/tasks/runtime/${taskId}/events?token=${encodeURIComponent(state.tokenA)}`).then(async (res) => {
    const reader = res.body.getReader()
    const dec = new TextDecoder()
    let buf = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += dec.decode(value, { stream: true })
      // 逐事件解析
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
        }
      }
    }
  }).catch(reject)
  // 60s 兜底
  setTimeout(() => resolve(null), 60000)
})
check('SSE 流式收到 progress 事件（result 之前有实时输出）', progressCount > 0 && sawResult, `progress×${progressCount}`)
if (firstProgress) console.log('   首条进度:', firstProgress.slice(0, 120))

// 3. 轮询任务详情拿最终结果
let task = null
for (let i = 0; i < 240; i++) {
  await new Promise((s) => setTimeout(s, 500))
  task = await api(`/api/tasks/runtime/${taskId}`, { token: state.tokenA })
  if (task.status !== 'running') break
}
check('真实 CLI 任务完成', task?.status === 'done', `耗时=${(task.finishedAt || 0) - task.startedAt}ms tokens=${task.tokens} cost=${task.cost}`)
check('日志包含真实输出（非 mock 标记）', !(task?.log || '').includes('EXEC_MODE=mock') && (task?.log || '').trim().length > 20)
console.log('\n   ── 真实执行日志（节选） ──')
console.log((task?.log || '').slice(0, 600))

console.log(failures === 0 ? '\n🎉 真实 CLI 接管验证通过' : `\n⚠️ 有 ${failures} 处失败`)
process.exit(failures === 0 ? 0 : 1)