# Resolve 后端服务

Resolve · AI Agent P2P 调度与交易平台的后端 API 服务。

## 技术栈

- **Node.js + Express + TypeScript**
- **SQLite**（better-sqlite3，零配置，后续可迁移 PostgreSQL）
- **JWT** 认证（jsonwebtoken）
- **Zod** 请求参数校验

## 快速开始

```bash
cd backend
npm install

# 配置环境变量（可选，有默认值）
cp .env.example .env

# 开发模式（tsx watch 热重载）
npm run dev

# 生产构建
npm run build
npm start
```

服务默认运行在 `http://localhost:4000`，健康检查：`GET /api/health`。

## 目录结构

```
backend/
├── src/
│   ├── index.ts          # 入口：挂载路由、启动服务
│   ├── config.ts         # 环境变量配置
│   ├── db/index.ts       # SQLite 连接 + 建表
│   ├── middleware/auth.ts # JWT 认证中间件
│   ├── types/index.ts    # 领域类型（与前端对齐）
│   ├── utils/index.ts    # 工具函数
│   └── routes/           # 业务路由
│       ├── auth.ts       # 认证
│       ├── profile.ts    # 个人资料
│       ├── wallet.ts     # 钱包/计费
│       ├── market.ts     # Agent 市场
│       ├── tasks.ts      # 任务中心
│       └── enterprise.ts # 企业版
├── data/                 # SQLite 数据文件（自动生成）
├── .env.example
├── package.json
└── tsconfig.json
```

## API 一览

所有业务接口均需携带 `Authorization: Bearer <token>`。

### 认证 `/api/auth`
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/register` | 邮箱注册 `{name, email, password}` |
| POST | `/login` | 邮箱登录 `{email, password}` |
| POST | `/oauth/github` | GitHub 登录 `{name, github, email?}` |
| GET | `/me` | 当前登录用户 |
| GET | `/status` | 登录状态 |

### 个人资料 `/api/profile`
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 主页数据（资料+Agent+节点+统计+热力图） |
| PATCH | `/` | 更新资料 |
| PUT | `/node` | 发布/更新节点 |
| GET | `/billing?top=n` | 账单流水 |

### 钱包 `/api/wallet`
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 钱包+账单 |
| POST | `/recharge` | 充值 `{amount, method}` |
| POST | `/withdraw` | 提现 `{amount}` |

### Agent 市场 `/api/market`
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 市场列表 |
| POST | `/` | 上架 Agent |
| POST | `/:id/call` | 调用 Agent（按次计费）`{prompt}` |

### 任务中心 `/api/tasks`
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 任务列表 |
| POST | `/` | 创建任务 |
| POST | `/:id/cancel` | 取消任务 |
| POST | `/:id/rerun` | 重跑任务 |

### 企业版 `/api/enterprise`
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 企业信息 |
| POST | `/members/:id/call` | 调用成员 Agent |
| POST | `/settings` | 更新设置 |
| PATCH | `/` | 更新基本信息 |
| PATCH | `/members/:id` | 更新成员 |
| POST | `/members/:id/role` | 设置成员角色 |
| DELETE | `/members/:id` | 移除成员 |

## 对接前端

前端 `frontend-dev/src/api/index.ts` 目前是 mock 实现。接入真实后端时，将各 `api` 对象的方法替换为 `fetch` 调用即可，**签名保持不变**。Vite 开发时可在 `vite.config.ts` 配置代理：

```ts
server: {
  proxy: {
    '/api': { target: 'http://localhost:4000', changeOrigin: true },
  },
}
```

## A 接管 B 电脑上的 Agent（全链路）

```
B 发布节点(PUT /api/profile/node) ──► 拿到 nodeId + token（响应含 id）
        │
        ▼
B 运行 node-agent（backend/node-agent）──► WS 连 ws://<server>/ws?token=...
        │   register 时按 DB 校验 token/userId 归属，并把 nodes.connected 回写 1
        ▼
B 上架市场 Agent（POST /api/market，绑定 nodeId）
        │
        ▼
A 调用（POST /api/market/:id/call {prompt}）──► 立即返回 taskId（202，异步）
        │   A/B 前端用 SSE 订阅 /api/tasks/runtime/:id/events 实时看执行过程
        ▼
node-agent 流式执行（EXEC_MODE=mock 分阶段输出 / cli 逐行回传 stdout+stderr）
        │   task_progress 经 WS 实时转发，完成后 task_result 触发结算
        ▼
A 收到结果并被扣费；B 在个人主页「节点执行记录」看到实时日志
```

B 侧启动命令（个人主页「接入 Agent」发布后会自动生成，带真实 NODE_ID/USER_ID/TOKEN）：

```powershell
cd backend/node-agent
$env:SERVER_URL="ws://localhost:4000/ws"
$env:NODE_ID="<节点 id>"; $env:USER_ID="<用户 id>"; $env:TOKEN="<节点 token>"
$env:EXEC_MODE="cli"   # mock=模拟分阶段输出；cli=调用本机真实 Agent（codex/claude/openclaw/gemini）
npm run dev
```

> - **扫描本机 Agent**：节点代理启动时自动扫描本机已安装的 codex / claude / openclaw / gemini（路径、版本、登录状态），随注册上报；个人主页「接入 Agent」页实时展示扫描结果，勾选即可一键上架到市场。也可在「接入 Agent」页点「重新扫描」，或单独运行 `npx tsx scan.ts`。
> - **实时可视化**：A 在调用弹窗、B 在「节点执行记录」都能看到逐行滚动的执行终端（SSE 推送）。
> - **真实 Agent**：`EXEC_MODE=cli` 会调用本机 CLI（如 `claude -p "..."`、`codex exec "..."`）并逐块回传输出；已验证本机 `claude` 可完整跑通（A 调用 → B 电脑执行 → 结果回传计费）。
> - **不做**：当前不提供执行中的指令下发 / 打断（任务为一次性提交）。
> - **安全**：WS 注册按 `nodes` 表校验 token 与 user_id 归属；运行时任务仅调用方 A 与节点归属方 B 可查看（403 拒绝无关方）。

端到端验证脚本（位于 backend/）：

```bash
node e2e-takeover.mjs setup   # 注册 B/A、B 发布节点并上架 Agent、A 充值
# 按输出启动真实 node-agent（见上），待其打印「节点注册成功」
node e2e-takeover.mjs call    # A 调用 B 的 Agent，验证异步+SSE+扣费+B 侧可见
node e2e-scan.mjs             # 验证「扫描接入」全链路（自动扫描→重扫→一键上架→调用）
node e2e-claude.mjs           # 真实本地 Claude 全链路（需本机已登录 claude）
node e2e-security.mjs         # WS 注册安全验证（伪造 token/nodeId 拒绝）
node cleanup-e2e.mjs          # 清理测试数据
```

## 后续规划

- [ ] 任务中心（/api/tasks 的 once/schedule）尚未接入节点下发，仍为模拟
- [ ] 微信/支付宝支付回调
- [ ] 企业内网节点通信——`/enterprise/members/:id/call` 目前为模拟
- [ ] 执行中的指令下发与打断（当前一次性提交）
- [ ] 数据库迁移到 PostgreSQL