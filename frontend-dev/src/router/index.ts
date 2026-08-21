import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  // ---- 认证（无壳） ----
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { guestOnly: true, title: '登录' },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/auth/RegisterView.vue'),
    meta: { guestOnly: true, title: '注册' },
  },
  {
    path: '/oauth/callback',
    name: 'oauth-callback',
    component: () => import('@/views/auth/OAuthCallbackView.vue'),
    meta: { title: '正在登录…' },
  },

  // ---- 应用（带 AppShell 外壳） ----
  {
    path: '/',
    component: () => import('@/components/layout/AppShell.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'dashboard', component: () => import('@/views/DashboardView.vue'), meta: { title: '概览' } },
      { path: 'u/:handle', name: 'profile', component: () => import('@/views/ProfileView.vue'), meta: { title: '个人主页' } },
      { path: 'profile/edit', name: 'profile-edit', component: () => import('@/views/ProfileEditView.vue'), meta: { title: '编辑资料' } },
      { path: 'connect', name: 'connect', component: () => import('@/views/ConnectView.vue'), meta: { title: '接入 Agent' } },
      { path: 'market', name: 'market', component: () => import('@/views/MarketView.vue'), meta: { title: 'Agent 市场' } },
      { path: 'market/publish', name: 'market-publish', component: () => import('@/views/PublishAgentView.vue'), meta: { title: '上架 Agent' } },
      { path: 'market/:id', name: 'agent-detail', component: () => import('@/views/AgentDetailView.vue'), meta: { title: 'Agent 详情' } },
      { path: 'wallet', name: 'wallet', component: () => import('@/views/WalletView.vue'), meta: { title: '钱包' } },
      { path: 'wallet/billing', name: 'billing', component: () => import('@/views/BillingView.vue'), meta: { title: '账单流水' } },
      { path: 'tasks', name: 'tasks', component: () => import('@/views/TasksView.vue'), meta: { title: '任务' } },
      { path: 'tasks/:id', name: 'task-detail', component: () => import('@/views/TaskDetailView.vue'), meta: { title: '任务详情' } },
      { path: 'enterprise', name: 'enterprise', component: () => import('@/views/EnterpriseView.vue'), meta: { title: '企业版' } },
      { path: 'enterprise/admin', name: 'enterprise-admin', component: () => import('@/views/EnterpriseAdminView.vue'), meta: { title: '企业管理' } },
      { path: 'enterprise/m/:id', name: 'member-detail', component: () => import('@/views/MemberDetailView.vue'), meta: { title: '成员详情' } },
      { path: 'settings', name: 'settings', component: () => import('@/views/SettingsView.vue'), meta: { title: '设置' } },
    ],
  },

  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFoundView.vue'), meta: { title: '页面未找到' } },
]

// hash 模式：dev / preview / file 直开均可用，无需服务端 rewrite
const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior(to, _from, saved) {
    if (saved) return saved
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { name: 'dashboard' }
  }
})

router.afterEach((to) => {
  const base = 'Resolve · AI Agent 协作平台'
  document.title = to.meta.title ? `${to.meta.title as string} · Resolve` : base
})

export default router
