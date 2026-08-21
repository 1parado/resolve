<script setup lang="ts">
import { computed } from 'vue'
import { t } from '@/i18n'

const props = withDefaults(
  defineProps<{
    status: 'online' | 'offline' | 'busy'
    label?: string
  }>(),
  { label: '' },
)

const text = computed(() => props.label || t(props.status === 'online' ? '在线' : props.status === 'busy' ? '忙碌' : '离线'))
</script>

<template>
  <span class="dot" :class="'is-' + status">
    <i class="dot__pulse" />
    {{ text }}
  </span>
</template>

<style scoped>
.dot {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-mid);
  white-space: nowrap;
}
.dot__pulse {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--text-faint);
  flex: 0 0 auto;
}
.is-online { color: var(--success); }
.is-online .dot__pulse { background: var(--success); box-shadow: 0 0 0 3px var(--success-soft); }
.is-busy { color: #b45309; }
.is-busy .dot__pulse { background: var(--warn); }
</style>