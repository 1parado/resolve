/* ==========================================================================
   types/index.ts — 领域类型定义（与 mock/api/stores 对齐）
   ========================================================================== */

export type OSId = 'apple' | 'windows' | 'linux'
export interface OS { id: OSId; label: string }

export type Provider = 'github' | 'email'

export interface SessionUser {
  name: string
  github?: string
  email?: string
  color?: string
  provider?: Provider
}
export interface Session {
  provider: Provider
  user: SessionUser
  at: number
}

export interface Profile {
  name: string
  github: string
  job: string
  os: OS
  bio: string
  joined: string
}

export type AgentStatus = 'online' | 'standby' | 'offline'
export interface Agent {
  id: string
  name: string
  product: string
  icon: string
  status: AgentStatus
  accent: string
  models: string[]
  price: string
  unit: string
  tags: string[]
  desc: string
}

export type Visibility = 'public' | 'enterprise'
export interface NodeInfo {
  connected: boolean
  name: string
  ip: string
  port: string
  runtime: string
  os: string
  visibility: Visibility
  agents: string[]
  published: boolean
}

export type BillingType = 'call' | 'recharge' | 'withdraw'
export interface Billing {
  id: string
  time: number
  type: BillingType
  agent: string
  amount: number
  status: string
  method: string
}

export type MarketCat = 'code' | 'reason' | 'ops' | 'content' | 'data' | 'design'
export interface MarketItem {
  id: string
  cat: MarketCat
  name: string
  vendor: string
  vendorGithub: string
  icon: string
  accent: string
  online: boolean
  rating: number
  orders: number
  price: string
  priceNum: number
  tags: string[]
  models: string[]
  desc: string
  sla: string
  featured?: boolean
}

export type MemberRole = '管理员' | '成员'
export interface Member {
  id: string
  name: string
  job: string
  os: OS
  role: MemberRole
  online: boolean
  avatar: string
  agents: string[]
  models: string[]
}
export interface EntLog {
  time: number
  who: string
  action: string
  result: string
  type: string
}
export interface Enterprise {
  name: string
  seats: number
  members: Member[]
  resources: { name: string; cpu: number; mem: number; uptime: string }[]
  usage: { monthCalls: number; monthTokens: string; monthFee: number }
  logs: EntLog[]
  settings: Record<string, boolean | string>
}

export interface Wallet {
  balance: number
  monthCost: number
}

export type TaskStatus = 'running' | 'done' | 'failed' | 'cancelled' | 'pending'
export type TaskType = 'once' | 'schedule'
export interface TaskItem {
  id: string
  title: string
  agent: string
  agentIcon: string
  agentAccent: string
  type: TaskType
  status: TaskStatus
  progress: number
  tokens: number
  cost: number
  created: number
  schedule?: string
}

export interface HeatStat {
  today: number
  week: number
  total: number
  monthVolume: number
  revenue: number
  onlineHours: number
  successRate: number
}

export interface AppData {
  session: Session | null
  profile: Profile
  agents: Agent[]
  node: NodeInfo
  wallet: Wallet
  billing: Billing[]
  marketplace: MarketItem[]
  enterprise: Enterprise
  tasks: TaskItem[]
}