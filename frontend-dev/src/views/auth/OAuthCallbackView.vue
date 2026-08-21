<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import AppIcon from '@/components/icons/AppIcon.vue'

const auth = useAuthStore()
const ui = useUiStore()
const router = useRouter()

onMounted(async () => {
  await new Promise((r) => setTimeout(r, 600))
  if (!auth.isAuthenticated) {
    await auth.login('github', { name: '陈默', github: 'chenmo-dev', email: 'chenmo.dev@gmail.com', color: '#1a73e8' })
    ui.toast({ type: 'success', title: '登录成功', desc: '欢迎回来，陈默' })
  }
  router.replace('/')
})
</script>

<template>
  <div class="oauth-page">
    <div class="oauth-card">
      <span class="oauth-spinner"><AppIcon name="refresh" :size="22" /></span>
      <p class="oauth-text">正在完成 GitHub 登录…</p>
      <p class="oauth-sub">即将进入 Resolve 控制台</p>
    </div>
  </div>
</template>

<style scoped>
.oauth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
}
.oauth-card {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: var(--r-xl);
  box-shadow: var(--sh-2);
  padding: 40px 56px;
  text-align: center;
}
.oauth-spinner {
  display: inline-flex;
  color: var(--brand);
  animation: spin 0.9s linear infinite;
}
.oauth-text { margin-top: 16px; font-size: 14px; font-weight: 600; color: var(--text-strong); }
.oauth-sub { margin-top: 6px; font-size: 12.5px; color: var(--text-weak); }
@keyframes spin { to { transform: rotate(360deg); } }
</style>