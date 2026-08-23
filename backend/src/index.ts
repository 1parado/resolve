import express from 'express'
import cors from 'cors'
import { createServer } from 'node:http'
import { config } from './config.js'
import { initDb } from './db/index.js'
import { setupWsServer } from './ws/index.js'
import authRouter from './routes/auth.js'
import profileRouter from './routes/profile.js'
import walletRouter from './routes/wallet.js'
import marketRouter from './routes/market.js'
import tasksRouter from './routes/tasks.js'
import enterpriseRouter from './routes/enterprise.js'

initDb()

const app = express()
app.use(cors({ origin: config.corsOrigin, credentials: true }))
app.use(express.json())

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ts: Date.now() })
})

// 业务路由
app.use('/api/auth', authRouter)
app.use('/api/profile', profileRouter)
app.use('/api/wallet', walletRouter)
app.use('/api/market', marketRouter)
app.use('/api/tasks', tasksRouter)
app.use('/api/enterprise', enterpriseRouter)

// 统一错误处理
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  res.status(500).json({ error: '服务器内部错误' })
})

// 创建 HTTP server 并挂载 WebSocket（/ws）
const server = createServer(app)
setupWsServer(server)

server.listen(config.port, () => {
  console.log(`✅ Resolve 后端已启动: http://localhost:${config.port}`)
  console.log(`   健康检查: http://localhost:${config.port}/api/health`)
  console.log(`   WebSocket: ws://localhost:${config.port}/ws`)
})