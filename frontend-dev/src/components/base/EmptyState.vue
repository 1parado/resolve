<script setup lang="ts">
import AppIcon from '@/components/icons/AppIcon.vue'

withDefaults(
  defineProps<{
    icon?: string
    brandIcon?: string
    title: string
    desc?: string
    actionText?: string
  }>(),
  { icon: '', brandIcon: '' },
)

const emit = defineEmits<{ (e: 'action'): void }>()
</script>

<template>
  <div class="empty">
    <div class="empty__icon">
      <AppIcon v-if="brandIcon" :name="brandIcon" brand :size="26" />
      <AppIcon v-else :name="icon || 'info'" :size="26" />
    </div>
    <div class="empty__title">{{ title }}</div>
    <p v-if="desc" class="empty__desc">{{ desc }}</p>
    <button v-if="actionText" class="empty__action" type="button" @click="emit('action')">
      <span>{{ actionText }}</span>
      <AppIcon name="chev-right" :size="14" />
    </button>
  </div>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 36px 20px;
}
.empty__icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: var(--surface-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-weak);
  margin-bottom: 14px;
}
.empty__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-strong);
}
.empty__desc {
  margin-top: 6px;
  font-size: 13px;
  color: var(--text-weak);
  max-width: 320px;
  line-height: 1.6;
}
.empty__action {
  margin-top: 18px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  border-radius: 10px;
  background: var(--brand);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  box-shadow: var(--sh-brand);
  transition: all var(--dur) var(--ease);
}
.empty__action:hover {
  background: var(--brand-hover);
  transform: translateY(-1px);
}
</style>