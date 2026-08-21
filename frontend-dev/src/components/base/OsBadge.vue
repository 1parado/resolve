<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/icons/AppIcon.vue'

const props = defineProps<{
  id: 'apple' | 'windows' | 'linux'
  label: string
}>()

const cls = computed(() => 'os os--' + props.id)
</script>

<template>
  <span :class="cls">
    <AppIcon :name="id" brand :size="14" />
    <span class="os__label">{{ label }}</span>
  </span>
</template>

<style scoped>
.os {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: var(--r-pill);
  font-size: 12px;
  font-weight: 500;
  color: var(--text-mid);
  white-space: nowrap;
}
.os--apple { background: var(--os-mac-soft); border: 1px solid var(--os-mac-line); color: var(--os-mac); }
.os--windows { background: var(--os-win-soft); border: 1px solid var(--os-win-line); color: var(--os-win); }
.os--linux { background: var(--os-linux-soft); border: 1px solid var(--os-linux-line); color: var(--os-linux); }
</style>