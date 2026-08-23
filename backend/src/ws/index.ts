import { WebSocketServer, WebSocket } from 'ws'
import type { Server } from 'node:http'
import { randomUUID } from 'node:crypto'
import { db } from '../db/index.js'
import { appendTaskProgress, finishRuntimeTask, failNodeTasks } from '../runtime.js'

/**
 * 节点注册表：维护「节点 ↔ WebSocket 连接」的映射。
 * B 电脑上的节点代理主动建立 WS 长连接（出站），服务器据此向 B 下发任务。
 */

export interface NodeAgentInfo {
  nodeId: string
  userId: string
  name: string
  agents: string[]
  connectedAt: number
}

interface NodeConn {
  ws: WebSocket
  info: NodeAgentInfo
}

/** 节点 ID → 连接 */
const nodeConns = new Map<string, NodeConn>()
/** userId → 节点 ID（一个用户一个节点） */
const userNode = new Map<string, string>()

/** 注册一个节点连接 */
export function registerNode(ws: WebSocket, info: NodeAgentInfo): void {
  // 若该用户已有旧连接，先关闭
  const oldNodeId = userNode.get(info.userId)
  if (oldNodeId && oldNodeId !== info.nodeId) {
    const old = nodeConns.get(oldNodeId)
    if (old) {
      old.ws.close(4000, 'replaced')
      nodeConns.delete(oldNodeId)
    }
  }
  nodeConns.set(info.nodeId, { ws, info })
  userNode.set(info.userId, info.nodeId)
  // 把真实在线状态回写 DB，供前端个人主页展示
  try {
    db.prepare(`UPDATE nodes SET connected = 1 WHERE id = ?`).run(info.nodeId)
  } catch (e) {
    console.error('[ws] 回写节点在线状态失败:', (e as Error).message)
  }
  console.log(`[ws] 节点上线: ${info.name} (${info.nodeId}) agents=${info.agents.join(',')}`)
}

/** 持久化节点代理上报的本机 Agent 扫描快照 */
export function saveNodeAgents(nodeId: string, localAgents: Array<{ name: string; cli?: string; version?: string; authed?: boolean }>): void {
  if (!nodeId || !Array.isArray(localAgents)) return
  try {
    const names = localAgents.map((a) => a.name).filter(Boolean)
    db.prepare(`UPDATE nodes SET agents_info = ?, agents = ? WHERE id = ?`).run(
      JSON.stringify(localAgents),
      JSON.stringify(names),
      nodeId
    )
    console.log(`[ws] 节点 ${nodeId} 本机 Agent 扫描已更新: ${names.join(', ') || '(无)'}`)
  } catch (e) {
    console.error('[ws] 保存节点 Agent 扫描失败:', (e as Error).message)
  }
}

/** 请求节点重新扫描本机 Agent */
export function requestNodeScan(nodeId: string): boolean {
  const conn = nodeConns.get(nodeId)
  if (!conn || conn.ws.readyState !== WebSocket.OPEN) return false
  conn.ws.send(JSON.stringify({ type: 'scan_request' }))
  return true
}

/** 注销节点连接 */
export function unregisterNode(nodeId: string): void {
  const conn = nodeConns.get(nodeId)
  if (conn) {
    nodeConns.delete(nodeId)
    if (userNode.get(conn.info.userId) === nodeId) userNode.delete(conn.info.userId)
    // 回写离线状态
    try {
      db.prepare(`UPDATE nodes SET connected = 0 WHERE id = ?`).run(nodeId)
    } catch (e) {
      console.error('[ws] 回写节点离线状态失败:', (e as Error).message)
    }
    // 中断该节点上仍在运行的任务
    failNodeTasks(nodeId, '节点离线，任务中断')
    console.log(`[ws] 节点下线: ${conn.info.name} (${nodeId})`)
  }
}

/** 节点是否在线 */
export function isNodeOnline(nodeId: string): boolean {
  return nodeConns.has(nodeId)
}

/** 通过 userId 查节点是否在线 */
export function isUserOnline(userId: string): boolean {
  return userNode.has(userId)
}

/** 向指定节点下发任务，返回是否成功投递 */
export function sendTaskToNode(
  nodeId: string,
  task: { taskId: string; agent: string; prompt: string; callerName: string }
): boolean {
  const conn = nodeConns.get(nodeId)
  if (!conn || conn.ws.readyState !== WebSocket.OPEN) return false
  conn.ws.send(JSON.stringify({ type: 'task', ...task }))
  return true
}

/** 启动 WebSocket 服务（挂载到 HTTP server 的 /ws 路径） */
export function setupWsServer(server: Server): void {
  const wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', (ws, req) => {
    // 节点代理通过 URL 携带 token 认证：/ws?token=<nodeToken>
    const url = new URL(req.url || '', 'http://localhost')
    const token = url.searchParams.get('token')
    if (!token) {
      ws.close(4001, 'missing token')
      return
    }
    // 解析 token：nodeId.userId 的签名形式（简化：token 即 nodeId，userId 由注册消息携带）
    // 这里先建立连接，等待 register 消息完成认证
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString())
        if (msg.type === 'register') {
          // 认证：校验 URL token 与 DB 中该节点的 token / 归属一致（生产环境应再验签）
          if (msg.token !== token) {
            ws.close(4003, 'auth failed')
            return
          }
          const nodeRow = db.prepare(`SELECT id, user_id, token FROM nodes WHERE id = ?`).get(msg.nodeId) as
            | { id: string; user_id: string; token: string }
            | undefined
          if (!nodeRow || nodeRow.token !== msg.token || nodeRow.user_id !== msg.userId) {
            ws.close(4003, 'auth failed: node not found or token mismatch')
            return
          }
          registerNode(ws, {
            nodeId: msg.nodeId,
            userId: msg.userId,
            name: msg.name || '未命名节点',
            agents: msg.agents || [],
            connectedAt: Date.now(),
          })
          // 持久化本机 Agent 扫描快照（若注册时已带上）
          if (Array.isArray(msg.localAgents)) saveNodeAgents(msg.nodeId, msg.localAgents)
          ws.send(JSON.stringify({ type: 'registered', ok: true }))
        } else if (msg.type === 'agents_snapshot') {
          // 节点代理响应重新扫描请求：更新本机 Agent 快照
          saveNodeAgents(msg.nodeId || '', msg.localAgents || [])
        } else if (msg.type === 'task_result') {
          // 任务完成：结算、落库、推送 SSE result
          finishRuntimeTask(msg.taskId, {
            ok: msg.ok,
            output: msg.output || '',
            tokens: msg.tokens || 0,
            cost: msg.cost || 0,
          })
          console.log(`[ws] 任务结果: ${msg.taskId} ok=${msg.ok}`)
        } else if (msg.type === 'task_progress') {
          // 流式进度：转发到运行时存储并推送 SSE progress
          appendTaskProgress(msg.taskId, msg.delta || '')
        } else if (msg.type === 'pong') {
          // 心跳响应
        }
      } catch (e) {
        console.error('[ws] 消息解析失败', e)
      }
    })

    ws.on('close', () => {
      // 找到该 ws 对应的节点并注销
      for (const [nodeId, conn] of nodeConns) {
        if (conn.ws === ws) {
          unregisterNode(nodeId)
          break
        }
      }
    })

    ws.on('error', () => {
      /* 忽略 */
    })
  })

  // 心跳：每 30s ping 一次，清理失联节点
  const heartbeat = setInterval(() => {
    for (const [nodeId, conn] of nodeConns) {
      if (conn.ws.readyState === WebSocket.OPEN) {
        conn.ws.ping()
      } else {
        unregisterNode(nodeId)
      }
    }
  }, 30000)
  wss.on('close', () => clearInterval(heartbeat))

  console.log('[ws] WebSocket 服务已就绪: /ws')
}

/* ---------- 任务 ID ---------- */
export function genTaskId(): string {
  return 'task_' + randomUUID().replace(/-/g, '').slice(0, 16)
}