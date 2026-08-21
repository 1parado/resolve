<script setup lang="ts">
import { useRouter } from 'vue-router'
import { RouterLink, RouterView } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { useWalletStore } from '@/stores/wallet'
import AppIcon from '@/components/icons/AppIcon.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import { identicon, money } from '@/utils/format'

const auth = useAuthStore()
const ui = useUiStore()
const wallet = useWalletStore()
const router = useRouter()

const NAV = [
  { to: '/', label: '概览', icon: 'home' },
  { to: '/u/chenmo-dev', label: '个人主页', icon: 'user' },
  { to: '/market', label: 'Agent 市场', icon: 'market' },
  { to: '/connect', label: '接入', icon: 'plug' },
  { to: '/wallet', label: '钱包', icon: 'wallet' },
  { to: '/enterprise', label: '企业版', icon: 'building' },
]

function logout() {
  auth.logout()
  ui.toast({ type: 'info', title: '已退出登录' })
  router.push('/login')
}
</script>

<template>
  <aside class="side">
    <RouterLink to="/" class="side__brand">
      <span class="side__logo">R</span>
      <span class="side__name">Re<em>solve</em></span>
    </RouterLink>

    <nav class="side__nav" aria-label="主导航">
      <RouterLink v-for="n in NAV" :key="n.to" :to="n.to" class="side__item" :class="{ active: $route.path === n.to }">
        <span class="side__ico"><AppIcon :name="n.icon" :size="18" /></span>
        <span>{{ n.label }}</span>
      </RouterLink>
    </nav>

    <div class="side__foot">
      <div class="side-balance">
        <div class="side-balance__label">账户余额</div>
        <div class="side-balance__amt num">{{ money(wallet.wallet.balance) }}</div>
        <RouterLink to="/wallet" class="side-balance__btn">充值</RouterLink>
      </div>

      <div class="side__user">
        <AppAvatar :name="auth.user?.name || '匿名'" :src="identicon(auth.user?.github || auth.user?.name || '', 120)" :size="34" />
        <div class="side__userinfo">
          <div class="side__uname">{{ auth.user?.name }}</div>
          <div class="side__umeta">{{ auth.user?.provider === 'github' ? 'GitHub 登录' : '邮箱登录' }}</div>
        </div>
        <button class="side__exit" aria-label="退出登录" title="退出登录" @click="logout">
          <AppIcon name="logout" :size="16" />
        </button>
      </div>

      <button class="side__collapse" type="button" @click="ui.toggleSidebar()">
        <AppIcon name="chev-left" :size="15" />
        <span>收起侧边栏</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.side {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-right: 1px solid var(--border);
  padding: 18px 14px 16px;
}
.side__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 2px 8px 18px;
}
.side__logo {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: var(--brand-grad);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 700;
  box-shadow: var(--sh-brand);
}
.side__name {
  font-family: var(--font-display);
  font-size: 19px;
  font-weight: 600;
  color: var(--text-strong);
  letter-spacing: -0.02em;
}
.side__name em {
  font-style: normal;
  font-weight: 700;
}
.side__nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1 1 auto;
}
.side__item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 9px 12px;
  border-radius: 10px;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--text-mid);
  transition: all var(--dur) var(--ease);
}
.side__item:hover {
  background: var(--surface-hover);
  color: var(--text-strong);
}
.side__item.active {
  background: var(--brand-soft);
  color: var(--brand);
}
.side__item.active::before {
  content: '';
  position: absolute;
  left: -14px;
  top: 8px;
  bottom: 8px;
  width: 3px;
  border-radius: 2px;
  background: var(--brand);
}
.side__ico {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
}

.side__foot {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
}
.side-balance {
  position: relative;
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px 14px;
}
.side-balance__label {
  font-size: 11px;
  color: var(--text-faint);
}
.side-balance__amt {
  margin-top: 3px;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-strong);
}
.side-balance__btn {
  position: absolute;
  right: 10px;
  bottom: 10px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--brand);
  padding: 4px 10px;
  border-radius: 7px;
  background: var(--brand-soft);
}
.side-balance__btn:hover { background: var(--brand-line); }

.side__user {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 6px;
}
.side__userinfo { flex: 1 1 auto; min-width: 0; }
.side__uname {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-strong);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.side__umeta {
  font-size: 11px;
  color: var(--text-faint);
}
.side__exit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  color: var(--text-faint);
  transition: all var(--dur) var(--ease);
}
.side__exit:hover { color: var(--danger); background: var(--danger-soft); }

.side__collapse {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 9px;
  border-radius: 10px;
  font-size: 12.5px;
  color: var(--text-faint);
  transition: all var(--dur) var(--ease);
}
.side__collapse:hover { background: var(--surface-hover); color: var(--text-strong); }
</style>