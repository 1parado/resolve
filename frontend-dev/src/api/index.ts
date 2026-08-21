/* ==========================================================================
   api/index.ts — 模拟 API 层（真实的异步契约，内部走 mock 数据 + 延迟）
   未来接入真实后端时只需替换本文件的实现，签名保持不变。
   ========================================================================== */
import type { Billing, MarketItem, Member, MemberRole, NodeInfo, Profile, Provider, SessionUser, TaskItem, TaskType } from '@/types'
import * as mock from '@/mock'

const LATENCY = () => 160 + Math.random() * 240

function delay<T>(fn: () => T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(fn()), LATENCY()))
}

/* ---------- 会话 ---------- */
export const authApi = {
  login(provider: Provider, user: SessionUser) {
    return delay(() => {
      mock.login(provider, user)
      return mock.me()
    })
  },
  logout() {
    return delay(() => {
      mock.logout()
      return null
    })
  },
  me() {
    return delay(() => mock.me())
  },
  status() {
    return delay(() => mock.isAuthed())
  },
}

/* ---------- 个人资料 ---------- */
export const profileApi = {
  fetch() {
    return delay(() => ({
      profile: { ...mock.getData().profile },
      agents: mock.getData().agents.map((a) => ({ ...a })),
      node: { ...mock.getData().node },
      stats: mock.stats(),
      heatmap: mock.genHeatmap(),
    }))
  },
  update(patch: Partial<Profile>) {
    return delay(() => {
      mock.updateProfile(patch)
      return { ...mock.getData().profile }
    })
  },
  publishNode(patch: Partial<NodeInfo>) {
    return delay(() => {
      mock.publishNode(patch)
      return { ...mock.getData().node }
    })
  },
  billing(top?: number): Billing[] {
    const all = mock.getData().billing
    return top ? all.slice(0, top) : [...all]
  },
}

/* ---------- 钱包 ---------- */
export const walletApi = {
  fetch() {
    return delay(() => ({
      wallet: { ...mock.getData().wallet },
      billing: [...mock.getData().billing],
    }))
  },
  recharge(amount: number, method: string) {
    return delay(() => {
      mock.recharge(amount, method)
      return { ...mock.getData().wallet, billing: [...mock.getData().billing] }
    })
  },
  withdraw(amount: number) {
    return delay(() => {
      mock.withdraw(amount)
      return { ...mock.getData().wallet }
    })
  },
  spend(amount: number, agent: string) {
    return delay(() => {
      mock.spend(amount, agent)
      return { ...mock.getData().wallet }
    })
  },
}

/* ---------- Agent 市场 ---------- */
export const marketApi = {
  list(): MarketItem[] {
    return mock.getData().marketplace.map((m) => ({ ...m }))
  },
  call(id: string, prompt: string): Promise<{ finalCost: number; name: string }> {
    return delay(() => {
      const item = mock.getData().marketplace.find((m) => m.id === id)
      if (!item) throw new Error('agent not found')
      const estimated = item.priceNum >= 1 ? item.priceNum / 100 : item.priceNum * 18
      const finalCost = Math.max(0.05, Math.round((estimated * (0.72 + Math.random() * 0.55)) * 100) / 100)
      mock.spend(finalCost, item.name)
      return { finalCost, name: item.name }
    })
  },
  publish(input: Omit<MarketItem, 'id' | 'orders' | 'featured'>): Promise<MarketItem> {
    return delay(() => {
      const item: MarketItem = { ...input, id: 'm' + Date.now() + Math.floor(Math.random() * 999), orders: 0 }
      mock.addMarketItem(item)
      return { ...item }
    })
  },
}

/* ---------- 任务中心 ---------- */
export const tasksApi = {
  list(): TaskItem[] {
    return mock.getData().tasks.map((t) => ({ ...t }))
  },
  create(input: { title: string; agent: string; agentIcon: string; agentAccent: string; type: TaskType; schedule?: string }): Promise<TaskItem> {
    return delay(() => mock.addTask(input))
  },
  cancel(id: string): Promise<void> {
    return delay(() => mock.updateTask(id, { status: 'cancelled' }))
  },
  rerun(id: string): Promise<void> {
    return delay(() => mock.updateTask(id, { status: 'running', progress: 5 }))
  },
}

/* ---------- 企业版 ---------- */
export const enterpriseApi = {
  fetch() {
    return delay(() => ({
      ...mock.getData().enterprise,
      members: mock.getData().enterprise.members.map((m: Member) => ({ ...m })),
    }))
  },
  callMember(memberId: string, agent: string, prompt: string): Promise<{ cost: number }> {
    return delay(() => {
      const m = mock.getData().enterprise.members.find((x) => x.id === memberId)
      const cost = Math.round((2 + Math.random() * 6) * 100) / 100
      mock.addEntLog(m?.name || memberId, '调用 ' + agent, '成功 · ¥' + cost.toFixed(2))
      mock.getData().enterprise.usage.monthCalls += 1
      mock.setData()
      return { cost }
    })
  },
  setSetting(key: string, value: boolean | string) {
    return delay(() => {
      mock.setEntSetting(key, value)
      return { ...mock.getData().enterprise.settings }
    })
  },
  updateBasic(patch: Partial<{ name: string; seats: number }>) {
    return delay(() => {
      mock.updateEnt(patch)
      return { name: mock.getData().enterprise.name, seats: mock.getData().enterprise.seats }
    })
  },
  updateMember(id: string, patch: Partial<Member>) {
    return delay(() => {
      mock.updateMember(id, patch)
      return mock.getData().enterprise.members.find((m: Member) => m.id === id) || null
    })
  },
  setMemberRole(id: string, role: MemberRole) {
    return delay(() => {
      mock.setMemberRole(id, role)
      return mock.getData().enterprise.members.find((m: Member) => m.id === id) || null
    })
  },
  removeMember(id: string) {
    return delay(() => {
      mock.removeMember(id)
      return null
    })
  },
}