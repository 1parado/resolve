<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { useWalletStore } from '@/stores/wallet'
import AppIcon from '@/components/icons/AppIcon.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import AppDropdown from '@/components/base/AppDropdown.vue'
import { identicon, money } from '@/utils/format'

const ui = useUiStore()
const auth = useAuthStore()
const wallet = useWalletStore()
const router = useRouter()
const route = useRoute()

function logout() {
  auth.logout()
  ui.toast({ type: 'info', title: '已退出登录' })
  router.push('/login')
}

const userMenu = () => [
  { label: '个人主页', icon: 'user', onClick: () => router.push('/u/chenmo-dev') },
  { label: '我的钱包', icon: 'wallet', onClick: () => router.push('/wallet') },
  { label: '企业版', icon: 'building', onClick: () => router.push('/enterprise') },
  { label: '退出登录', icon: 'logout', danger: true, onClick: logout },
]

function onBell() {
  ui.toast({ type: 'info', title: '暂无新通知', desc: '有 Agent 被调用或充值到账时会第一时间通知你' })
}
</script>

<template>
  <header class="topbar">
    <div class="topbar__left">
      <button v-if="ui.sidebarCollapsed || ui.isMobile" class="topbar__menu" aria-label="打开导航菜单" @click="ui.toggleSidebar()">
        <AppIcon name="list" :size="18" />
      </button>
      <span class="topbar__title">{{ String(route.meta.title || 'Resolve') }}</span>
    </div>
    <div class="topbar__right">
      <button v-if="!ui.isMobile" class="topbar__chip" @click="router.push('/wallet')">
        <AppIcon name="coins" :size="15" />
        <span class="num">{{ money(wallet.wallet.balance) }}</span>
      </button>
      <button class="topbar__icon" aria-label="通知" @click="onBell">
        <AppIcon name="bell" :size="18" />
        <i class="topbar__badge" />
      </button>
      <AppDropdown :items="userMenu()" align="right">
        <AppAvatar :name="auth.user?.name || '匿名'" :src="identicon(auth.user?.github || auth.user?.name || '', 120)" :size="34" />
      </AppDropdown>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  position: sticky;
  top: 0;
  z-index: var(--z-nav);
  height: var(--topbar-h);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 20px;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border-bottom: 1px solid var(--border);
}
.topbar__left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.topbar__menu {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  color: var(--text-mid);
  transition: all var(--dur) var(--ease);
}
.topbar__menu:hover { background: var(--surface-hover); color: var(--text-strong); }
.topbar__title {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 600;
  color: var(--text-strong);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.topbar__right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.topbar__chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 34px;
  padding: 0 12px;
  border-radius: var(--r-pill);
  background: var(--surface-soft);
  border: 1px solid var(--border);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-strong);
  transition: all var(--dur) var(--ease);
}
.topbar__chip:hover { border-color: var(--brand-line); color: var(--brand); }
.topbar__icon {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  color: var(--text-mid);
  transition: all var(--dur) var(--ease);
}
.topbar__icon:hover { background: var(--surface-hover); color: var(--text-strong); }
.topbar__badge {
  position: absolute;
  top: 7px;
  right: 8px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--danger);
  border: 1.5px solid #fff;
}
</style>