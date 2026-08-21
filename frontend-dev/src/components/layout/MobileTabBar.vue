<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AppIcon from '@/components/icons/AppIcon.vue'
import { t } from '@/i18n'

const TABS = [
  { to: '/', label: '概览', icon: 'home' },
  { to: '/market', label: '市场', icon: 'market' },
  { to: '/connect', label: '接入', icon: 'plug', cta: true },
  { to: '/wallet', label: '钱包', icon: 'wallet' },
  { to: '/enterprise', label: '企业版', icon: 'building' },
]

function isActive(to: string, path: string): boolean {
  if (to === '/') return path === '/'
  return path === to
}
</script>

<template>
  <nav class="tabbar" :aria-label="t('底部导航')">
    <RouterLink v-for="tb in TABS" :key="tb.to" :to="tb.to" class="tabbar__item" :class="{ active: isActive(tb.to, $route.path), cta: tb.cta }">
      <span v-if="tb.cta" class="tabbar__cta">
        <AppIcon :name="tb.icon" :size="22" />
      </span>
      <AppIcon v-else :name="tb.icon" :size="20" />
      <span class="tabbar__label">{{ t(tb.label) }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: var(--z-nav);
  height: calc(var(--tabbar-h) + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border-top: 1px solid var(--border);
}
.tabbar__item {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  height: 100%;
  color: var(--text-faint);
  transition: color var(--dur) var(--ease);
}
.tabbar__item.active {
  color: var(--brand);
}
.tabbar__label {
  font-size: 10px;
  font-weight: 500;
}
.tabbar__cta {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  margin-top: -22px;
  border-radius: 17px;
  background: var(--brand-grad);
  color: #fff;
  box-shadow: var(--sh-brand);
  transition: transform var(--dur) var(--ease);
}
.tabbar__cta:hover { transform: translateY(-2px) scale(1.03); }
.tabbar__item.cta { color: var(--brand); }
</style>