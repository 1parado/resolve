<script setup lang="ts">
import { useRouter } from 'vue-router'
import { t } from '@/i18n'
import EmptyState from '@/components/base/EmptyState.vue'

const router = useRouter()
</script>

<template>
  <div class="page nf">
    <div class="nf__code">404</div>
    <EmptyState
      icon="help-circle"
      :title="t('页面未找到')"
      :desc="t('你访问的页面不存在或已被移动。')"
      :action-text="t('返回概览')"
      @action="router.push('/')"
    />
  </div>
</template>

<style scoped>
.nf {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 80px;
}
.nf__code {
  font-family: var(--font-display);
  font-size: 64px;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--brand);
  background: linear-gradient(135deg, var(--brand), #4a90e2);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
</style>