import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { authApi } from '@/api'
import { isAuthed, me } from '@/mock'
import type { Provider, SessionUser } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<SessionUser | null>(me())
  const loading = ref(false)

  const isAuthenticated = computed(() => !!user.value)
  const displayName = computed(() => user.value?.name || '')

  async function login(provider: Provider, u: SessionUser) {
    loading.value = true
    try {
      user.value = await authApi.login(provider, u)
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    user.value = null
    await authApi.logout()
  }

  function sync() {
    user.value = me()
  }

  return { user, loading, isAuthenticated, displayName, login, logout, sync }
})

/* 供路由守卫使用（避免 store 在 router 首次执行前被初始化） */
export function authReady(): boolean {
  return isAuthed()
}