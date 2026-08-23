import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { authApi } from '@/api'
import { getToken } from '@/api/client'
import type { Provider, SessionUser } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<SessionUser | null>(null)
  const loading = ref(false)

  const isAuthenticated = computed(() => !!user.value)
  const displayName = computed(() => user.value?.name || '')

  async function login(provider: Provider, u: SessionUser, password?: string) {
    loading.value = true
    try {
      user.value = await authApi.login(provider, u, password)
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    user.value = null
    await authApi.logout()
  }

  /** 应用启动时从后端恢复会话 */
  async function restore() {
    if (!getToken()) return
    try {
      user.value = await authApi.me()
    } catch {
      user.value = null
    }
  }

  return { user, loading, isAuthenticated, displayName, login, logout, restore }
})

/* 供路由守卫使用：本地有 token 即视为已登录（真实校验在 restore 中完成） */
export function authReady(): boolean {
  return !!getToken()
}