<script setup lang="ts">
import AppIcon from '@/components/icons/AppIcon.vue'

withDefaults(
  defineProps<{
    icon: string
    label: string
    value: string
    hint?: string
    accent?: boolean
  }>(),
  { accent: false },
)
</script>

<template>
  <div class="stat" :class="{ accent }">
    <div class="stat__icon">
      <AppIcon :name="icon" :size="16" />
    </div>
    <div class="stat__label">{{ label }}</div>
    <div class="stat__value">{{ value }}</div>
    <div v-if="hint" class="stat__hint">{{ hint }}</div>
  </div>
</template>

<style scoped>
.stat {
  position: relative;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  box-shadow: var(--sh-1);
  padding: 18px 20px;
  transition: box-shadow var(--dur) var(--ease), transform var(--dur) var(--ease);
}
.stat:hover {
  box-shadow: var(--sh-2);
  transform: translateY(-1px);
}
.stat__icon {
  position: absolute;
  top: 18px;
  right: 18px;
  width: 30px;
  height: 30px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-weak);
  background: var(--surface-soft);
}
.stat.accent .stat__icon {
  color: var(--brand);
  background: var(--brand-soft);
}
.stat__label {
  font-size: 12px;
  color: var(--text-weak);
}
.stat__value {
  margin-top: 8px;
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-strong);
}
.stat__hint {
  position: absolute;
  bottom: 18px;
  right: 18px;
  font-size: 11px;
  color: var(--text-faint);
}
</style>