/**
 * 本机 Agent 扫描器
 * 在供给方（B）电脑上探测已安装的 Agent CLI（codex / claude / openclaw / gemini），
 * 返回：可执行文件路径、版本、是否已登录（可真实调用）。
 * 结果随节点注册上报中心服务器，前端「接入 Agent」页据此展示真实可接入的本地 Agent。
 */
import { spawnSync } from 'node:child_process'
import { homedir } from 'node:os'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

export interface LocalAgentDetected {
  id: string // 唯一标识，如 'codex'
  name: string // 显示名
  cli: string // 命令行调用名
  path: string // 可执行文件路径（''=未找到）
  version: string // 版本（''=未知）
  authed: boolean // 是否已登录/可直接真实调用
}

interface AgentDef {
  id: string
  name: string
  cli: string
  authFiles: string[]
}

const DEFS: AgentDef[] = [
  { id: 'codex', name: 'Codex', cli: 'codex', authFiles: ['.codex/auth.json', '.codex/auth.json5'] },
  { id: 'claude', name: 'Claude Code', cli: 'claude', authFiles: ['.claude/.credentials.json', '.claude.json'] },
  { id: 'openclaw', name: 'OpenClaw', cli: 'openclaw', authFiles: [] },
  { id: 'gemini', name: 'Gemini', cli: 'gemini', authFiles: ['.gemini'] },
]

const home = homedir()

/** 解码子进程输出（Windows 原生工具输出为 GBK/当前代码页） */
function decode(buf: Buffer | string | null | undefined): string {
  if (!buf) return ''
  if (typeof buf === 'string') return buf
  try {
    return new TextDecoder('gbk').decode(buf)
  } catch {
    return buf.toString('utf8')
  }
}

/** 在 PATH 中定位可执行文件路径（Windows where.exe / 其它 which） */
function findBin(cli: string): string {
  const cmd = process.platform === 'win32' ? 'where.exe' : 'which'
  try {
    const r = spawnSync(cmd, [cli], { shell: false, timeout: 8000, windowsHide: true, encoding: 'buffer' })
    if (r.status === 0 && r.stdout) {
      const first = decode(r.stdout).split(/\r?\n/).map((s) => s.trim()).find(Boolean)
      return first || ''
    }
  } catch {
    /* 忽略 */
  }
  return ''
}

/** 读取版本号（--version / -v），最多 3s；Windows 下经 cmd 以支持 npm 的 .cmd 包装 */
function readVersion(cli: string): string {
  const useShell = process.platform === 'win32'
  const cmd = useShell ? (process.env.ComSpec || 'cmd.exe') : cli
  for (const args of [['--version'], ['-v'], ['version']]) {
    try {
      const spawnArgs = useShell ? ['/d', '/c', `${cli} ${args.join(' ')}`] : args
      const r = spawnSync(cmd, spawnArgs, { shell: false, timeout: 3000, windowsHide: true, encoding: 'buffer' })
      if (r.status === 0) {
        const line = decode(r.stdout).split(/\r?\n/).map((s) => s.trim()).find(Boolean)
        if (line) return line.slice(0, 60)
        const errLine = decode(r.stderr).split(/\r?\n/).map((s) => s.trim()).find(Boolean)
        if (errLine && /v?\d+(\.\d+)+/.test(errLine)) return errLine.slice(0, 60)
      }
    } catch {
      /* 继续尝试下一个参数形式 */
    }
  }
  return ''
}

/** 判断是否已登录（存在凭据文件即认为可真实调用） */
function checkAuthed(def: AgentDef): boolean {
  if (!def.authFiles.length) return true // 无凭据概念（如 openclaw），安装即可用
  return def.authFiles.some((p) => existsSync(join(home, p)))
}

/** 扫描本机已安装的 Agent */
export function detectLocalAgents(): LocalAgentDetected[] {
  const out: LocalAgentDetected[] = []
  for (const def of DEFS) {
    const path = findBin(def.cli)
    if (!path) continue
    const version = readVersion(def.cli)
    out.push({
      id: def.id,
      name: def.name,
      cli: def.cli,
      path,
      version,
      authed: checkAuthed(def),
    })
  }
  return out
}

/** 扫描并在控制台打印（供手动验证） */
export function printLocalAgents(): void {
  const agents = detectLocalAgents()
  if (!agents.length) {
    console.log('未检测到本机已安装的 Agent（codex / claude / openclaw / gemini）')
    return
  }
  console.log(`检测到 ${agents.length} 个本地 Agent:`)
  for (const a of agents) {
    console.log(
      `  - ${a.name} ${a.version ? '(' + a.version + ')' : ''} [${a.authed ? '已登录✓' : '未登录✗'}] ${a.path}`
    )
  }
}
