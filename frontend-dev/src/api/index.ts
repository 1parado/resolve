/* ==========================================================================
   api/index.ts — 真实后端 API 层
   通过 HTTP 调用后端服务（Express + SQLite），签名与 mock 版本保持一致，
   因此 store / 组件层无需改动。
   ========================================================================== */
import type { Billing, MarketItem, Member, MemberRole, NodeInfo, Profile, Provider, RuntimeTask, SessionUser, TaskItem, TaskType } from '@/types'
import type { Agent, Enterprise, HeatStat, Wallet } from '@/types'
import { http, setToken, ApiError, getToken } from './client'

/* ---------- 会话 ---------- */
export const authApi = {
  async login(provider: Provider, user: SessionUser, password?: string) {
    if (provider === 'github') {
      const r = await http.post<{ token: string; user: SessionUser }>('/auth/oauth/github', {
        name: user.name,
        github: user.github,
        email: user.email,
      }, false)
      setToken(r.token)
      return r.user
    }
    // email 登录：用密码登录，若账号不存在则注册
    const pwd = password || 'resolve-demo'
    try {
      const r = await http.post<{ token: string; user: SessionUser }>('/auth/login', {
        email: user.email,
        password: pwd,
      }, false)
      setToken(r.token)
      return r.user
    } catch (e) {
      // 账号不存在（404）时自动注册；密码错误（401）则抛出
      if (e instanceof ApiError && e.status === 404) {
        const r = await http.post<{ token: string; user: SessionUser }>('/auth/register', {
          name: user.name,
          email: user.email,
          password: pwd,
        }, false)
        setToken(r.token)
        return r.user
      }
      throw e
    }
  },
  async logout() {
    setToken(null)
    return null
  },
  async me() {
    try {
      const r = await http.get<{ user: SessionUser }>('/auth/me')
      return r.user
    } catch {
      return null
    }
  },
  async status() {
    try {
      await http.get('/auth/status')
      return true
    } catch {
      return false
    }
  },
}

/* ---------- 个人资料 ---------- */
export const profileApi = {
  async fetch() {
    const r = await http.get<{
      profile: Profile
      agents: Agent[]
      node: NodeInfo
      stats: HeatStat
      heatmap: number[]
    }>('/profile')
    return {
      profile: r.profile,
      agents: r.agents,
      node: r.node,
      stats: r.stats,
      heatmap: r.heatmap,
    }
  },
  async update(patch: Partial<Profile>) {
    return http.patch<Profile>('/profile', patch)
  },
  async publishNode(patch: Partial<NodeInfo>) {
    return http.put<NodeInfo>('/profile/node', patch)
  },
  /** 请求本机节点重新扫描本地 Agent */
  async scanNode() {
    return http.post<{ ok: boolean }>('/profile/node/scan')
  },
  async billing(top?: number): Promise<Billing[]> {
    const q = top ? `?top=${top}` : ''
    return http.get<Billing[]>(`/profile/billing${q}`)
  },
}

/* ---------- 钱包 ---------- */
export const walletApi = {
  async fetch() {
    return http.get<{ wallet: Wallet; billing: Billing[] }>('/wallet')
  },
  async recharge(amount: number, method: string) {
    return http.post<{ wallet: Wallet; billing: Billing[] }>('/wallet/recharge', { amount, method })
  },
  async withdraw(amount: number) {
    return http.post<Wallet>('/wallet/withdraw', { amount })
  },
  async spend(amount: number, agent: string) {
    return http.post<Wallet>('/wallet/spend', { amount, agent })
  },
}

/* ---------- Agent 市场 ---------- */
export const marketApi = {
  async list(): Promise<MarketItem[]> {
    return http.get<MarketItem[]>('/market')
  },
  /** 异步发起调用：立即返回 taskId，执行过程通过 runtimeApi.subscribe 实时查看 */
  async call(id: string, prompt: string): Promise<{ taskId: string; name: string; status: string; vendor?: string }> {
    return http.post<{ taskId: string; name: string; status: string; vendor?: string }>(`/market/${id}/call`, { prompt })
  },
  async publish(input: Omit<MarketItem, 'id' | 'orders' | 'featured'>): Promise<MarketItem> {
    return http.post<MarketItem>('/market', input)
  },
}

/* ---------- 运行时任务（实时进度 SSE） ---------- */
export interface RuntimeResult {
  ok: boolean
  status: string
  output: string
  tokens: number
  cost: number
  finishedAt: number
}
export const runtimeApi = {
  /** 任务列表：role=caller 我发起的 | role=node 我节点上的 */
  async list(role: 'caller' | 'node' = 'caller'): Promise<RuntimeTask[]> {
    return http.get<RuntimeTask[]>(`/tasks/runtime?role=${role}`)
  },
  async get(id: string): Promise<RuntimeTask> {
    return http.get<RuntimeTask>(`/tasks/runtime/${id}`)
  },
  /**
   * 订阅任务实时进度（EventSource/SSE）。
   * 返回取消函数。任务结束后自动关闭连接。
   */
  subscribe(
    id: string,
    handlers: {
      onProgress?: (delta: string) => void
      onResult?: (r: RuntimeResult) => void
      onFail?: (msg: string) => void
    }
  ): () => void {
    const token = getToken() || ''
    const es = new EventSource(`/api/tasks/runtime/${id}/events?token=${encodeURIComponent(token)}`)
    es.addEventListener('progress', (e) => {
      try {
        handlers.onProgress?.((JSON.parse((e as MessageEvent).data) as { delta: string }).delta)
      } catch {
        /* 忽略 */
      }
    })
    es.addEventListener('result', (e) => {
      try {
        handlers.onResult?.(JSON.parse((e as MessageEvent).data) as RuntimeResult)
      } catch {
        /* 忽略 */
      }
      es.close()
    })
    es.addEventListener('fail', (e) => {
      try {
        handlers.onFail?.((JSON.parse((e as MessageEvent).data) as { message: string }).message)
      } catch {
        /* 忽略 */
      }
      es.close()
    })
    return () => es.close()
  },
}

/* ---------- 任务中心 ---------- */
export const tasksApi = {
  async list(): Promise<TaskItem[]> {
    return http.get<TaskItem[]>('/tasks')
  },
  async create(input: { title: string; agent: string; agentIcon: string; agentAccent: string; type: TaskType; schedule?: string }): Promise<TaskItem> {
    return http.post<TaskItem>('/tasks', input)
  },
  async cancel(id: string): Promise<void> {
    await http.post(`/tasks/${id}/cancel`)
  },
  async rerun(id: string): Promise<void> {
    await http.post(`/tasks/${id}/rerun`)
  },
}

/* ---------- 企业版 ---------- */
export const enterpriseApi = {
  async fetch() {
    return http.get<Enterprise>('/enterprise')
  },
  async callMember(memberId: string, agent: string, prompt: string): Promise<{ cost: number }> {
    return http.post<{ cost: number }>(`/enterprise/members/${memberId}/call`, { agent, prompt })
  },
  async setSetting(key: string, value: boolean | string) {
    return http.post<Record<string, boolean | string>>('/enterprise/settings', { key, value })
  },
  async updateBasic(patch: Partial<{ name: string; seats: number }>) {
    return http.patch<{ name: string; seats: number }>('/enterprise', patch)
  },
  async updateMember(id: string, patch: Partial<Member>) {
    return http.patch<Member>(`/enterprise/members/${id}`, patch)
  },
  async setMemberRole(id: string, role: MemberRole) {
    return http.post<Member>(`/enterprise/members/${id}/role`, { role })
  },
  async removeMember(id: string) {
    await http.del(`/enterprise/members/${id}`)
    return null
  },
}