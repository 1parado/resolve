import WebSocket from 'ws'
import { spawn } from 'node:child_process'
import { detectLocalAgents, printLocalAgents, type LocalAgentDetected } from './scanner.js'

/**
 * Resolve 节点代理
 * 运行在供给方（B）电脑上，主动连接中心服务器，接收并执行远程任务。
 * 支持流式：CLI 执行时把 stdout/stderr 逐行回传（task_progress），
 * A/B 双方浏览器可通过 SSE 实时看到执行过程。
 * 支持接入：启动时自动扫描本机已安装的 Agent（codex/claude/openclaw/gemini），
 * 随注册上报中心服务器；收到 scan_request 会重新扫描并回传快照。
 *
 * 用法：
 *   nodeId=xxx userId=xxx token=xxx nodeName="我的节点" agents="Codex,OpenClaw" \
 *   node-agent
 *
 * 单独扫描本机 Agent：npx tsx scan.ts
 *
 * 环境变量：
 *   SERVER_URL  中心服务器地址，默认 ws://localhost:4000/ws
 *   NODE_ID     节点 ID（在个人主页「接入 Agent」发布后获得）
 *   USER_ID     用户 ID
 *   TOKEN       节点 token（发布节点后返回）
 *   NODE_NAME   节点显示名
 *   AGENTS      该节点提供的 Agent 列表，逗号分隔
 *   EXEC_MODE   mock（模拟执行，默认）| cli（调用本机真实 CLI）
 *   CLI_TIMEOUT 单个任务超时（毫秒，默认 120000）
 */

const SERVER_URL = process.env.SERVER_URL || 'ws://localhost:4000/ws'
const NODE_ID = process.env.NODE_ID || ''
const USER_ID = process.env.USER_ID || ''
const TOKEN = process.env.TOKEN || ''
const NODE_NAME = process.env.NODE_NAME || '我的节点'
const AGENTS = (process.env.AGENTS || 'Codex,OpenClaw').split(',').map((s) => s.trim()).filter(Boolean)
const EXEC_MODE = process.env.EXEC_MODE || 'mock'
const CLI_TIMEOUT = Number(process.env.CLI_TIMEOUT) || 120000

if (!NODE_ID || !USER_ID || !TOKEN) {
  console.error('❌ 缺少必要环境变量：NODE_ID / USER_ID / TOKEN')
  console.error('   请在个人主页「接入 Agent」发布节点后，从返回的节点信息中获取。')
  process.exit(1)
}

let ws: WebSocket | null = null
let heartbeatTimer: NodeJS.Timeout | null = null

/** 扫描本机真实 Agent（注册时上报 + 收到 scan_request 时重扫） */
function scanLocalAgents(): LocalAgentDetected[] {
  const agents = detectLocalAgents()
  if (agents.length) {
    console.log(`[agent] 🔍 本机检测到 ${agents.length} 个 Agent: ` + agents.map((a) => `${a.name}${a.authed ? '(已登录)' : '(未登录)'}`).join(', '))
  } else {
    console.log('[agent] 🔍 本机未检测到 codex / claude / openclaw / gemini')
  }
  return agents
}

const localAgents: LocalAgentDetected[] = scanLocalAgents()

function connect(): void {
  const url = `${SERVER_URL}?token=${encodeURIComponent(TOKEN)}`
  console.log(`[agent] 连接中心服务器: ${url}`)
  ws = new WebSocket(url)

  ws.on('open', () => {
    console.log(`[agent] 已连接，注册节点: ${NODE_NAME} (${NODE_ID}) 模式=${EXEC_MODE}`)
    ws!.send(
      JSON.stringify({
        type: 'register',
        nodeId: NODE_ID,
        userId: USER_ID,
        token: TOKEN,
        name: NODE_NAME,
        agents: AGENTS,
        localAgents,
      })
    )
    // 心跳
    heartbeatTimer = setInterval(() => {
      if (ws!.readyState === WebSocket.OPEN) ws!.send(JSON.stringify({ type: 'ping' }))
    }, 25000)
  })

  ws.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw.toString())
      if (msg.type === 'registered') {
        console.log(`[agent] ✅ 节点注册成功，可接收任务`)
      } else if (msg.type === 'task') {
        console.log(`[agent] 📥 收到任务 ${msg.taskId}: [${msg.agent}] ${msg.prompt.slice(0, 60)}`)
        await handleTask(msg)
      } else if (msg.type === 'scan_request') {
        // 服务器要求重新扫描本机 Agent：扫完回传快照
        console.log('[agent] 🔍 收到重新扫描请求')
        const agents = scanLocalAgents()
        send({ type: 'agents_snapshot', nodeId: NODE_ID, localAgents: agents })
      } else if (msg.type === 'ping') {
        ws!.send(JSON.stringify({ type: 'pong' }))
      }
    } catch (e) {
      console.error('[agent] 消息处理失败', e)
    }
  })

  ws.on('close', (code) => {
    console.log(`[agent] 连接关闭 (${code})，5s 后重连…`)
    if (heartbeatTimer) clearInterval(heartbeatTimer)
    setTimeout(connect, 5000)
  })

  ws.on('error', (err) => {
    console.error('[agent] 连接错误:', err.message)
  })
}

function send(obj: Record<string, unknown>): void {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj))
}

function sendProgress(taskId: string, delta: string): void {
  send({ type: 'task_progress', taskId, delta })
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** 执行任务并流式回传进度 + 最终结果 */
async function handleTask(task: { taskId: string; agent: string; prompt: string; callerName: string }): Promise<void> {
  const start = Date.now()
  try {
    let output: string
    let tokens = 0

    if (EXEC_MODE === 'cli') {
      // 真实 CLI 模式：spawn 并逐行回传 stdout/stderr
      const cmd = buildCliCommand(task.agent, task.prompt)
      sendProgress(task.taskId, `▶ [${task.agent}] 开始执行（CLI）…\n`)
      output = await runCliStream(task.taskId, cmd)
    } else {
      // mock 模式：分阶段输出，模拟真实执行过程
      const lines = [
        `▶ [${task.agent}] 已接收来自「${task.callerName}」的任务\n`,
        `  └ 任务描述：${task.prompt}\n`,
        `⏳ [${task.agent}] 正在解析任务…\n`,
        `⏳ [${task.agent}] 思考中 / 生成中（模拟执行）…\n`,
        `✅ [${task.agent}] 执行完成\n`,
      ]
      output = ''
      for (const line of lines) {
        await sleep(500 + Math.random() * 700)
        sendProgress(task.taskId, line)
        output += line
      }
      const note = `\n—— 模拟执行结果（EXEC_MODE=mock）。配置 EXEC_MODE=cli 可调用真实 Agent。\n`
      output += note
      sendProgress(task.taskId, note)
    }

    tokens = Math.ceil(output.length / 4)
    const cost = Math.max(0.05, Math.round(tokens * 0.00003 * 100) / 100)
    send({
      type: 'task_result',
      taskId: task.taskId,
      ok: true,
      output,
      tokens,
      cost,
    })
    console.log(`[agent] ✅ 任务完成 ${task.taskId} tokens=${tokens} cost=${cost} 耗时=${Date.now() - start}ms`)
  } catch (e) {
    send({
      type: 'task_result',
      taskId: task.taskId,
      ok: false,
      output: `执行失败: ${(e as Error).message}`,
      tokens: 0,
      cost: 0,
    })
    console.error(`[agent] ❌ 任务失败 ${task.taskId}:`, (e as Error).message)
  }
}

/** 流式运行 CLI，返回完整输出（stdout+stderr 逐块回传为 task_progress） */
function runCliStream(taskId: string, cmd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let out = ''
    let settled = false
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        child.kill()
        reject(new Error(`执行超时（${CLI_TIMEOUT}ms）`))
      }
    }, CLI_TIMEOUT)

    const child = spawn(cmd, { shell: true, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })

    const onData = (chunk: Buffer) => {
      const s = chunk.toString()
      out += s
      sendProgress(taskId, s)
    }
    child.stdout?.on('data', onData)
    child.stderr?.on('data', onData)

    child.on('error', (err) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      reject(err)
    })
    child.on('close', (code) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (code === 0) resolve(out)
      else reject(new Error(`进程退出码 ${code}${out ? '\n' + out.slice(-3000) : ''}`))
    })
  })
}

/** 根据 Agent 名构造 CLI 命令（可扩展） */
function buildCliCommand(agent: string, prompt: string): string {
  const p = prompt.replace(/"/g, '""')
  const lower = agent.toLowerCase()
  if (lower.includes('codex')) return `codex exec "${p}"`
  if (lower.includes('claude')) return `claude -p "${p}"`
  if (lower.includes('openclaw')) return `openclaw run "${p}"`
  if (lower.includes('gemini')) return `gemini -p "${p}"`
  // 兜底：把任务打印出来，证明调度链路可用
  return `powershell -NoProfile -Command "Write-Host '未配置 ${agent} 的 CLI 命令'; Write-Host '任务: ${p}'; Start-Sleep -Seconds 1"`
}

connect()
