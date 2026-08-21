<script setup lang="ts">
import AppIcon from '@/components/icons/AppIcon.vue'

interface SegOption {
  value: string
  label: string
  icon?: string
  brandIcon?: string
}

const props = defineProps<{
  modelValue: string
  options: SegOption[]
}>()

const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()
</script>

<template>
  <div class="seg" role="tablist">
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      class="seg__item"
      :class="{ active: modelValue === opt.value }"
      role="tab"
      :aria-selected="modelValue === opt.value"
      @click="emit('update:modelValue', opt.value)"
    >
      <AppIcon v-if="opt.brandIcon" :name="opt.brandIcon" brand :size="15" />
      <AppIcon v-else-if="opt.icon" :name="opt.icon" :size="15" />
      <span>{{ opt.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.seg {
  display: inline-flex;
  align-items: center;
  background: var(--surface-sunken);
  border-radius: var(--r-pill);
  padding: 3px;
  gap: 2px;
}
.seg__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 14px;
  border-radius: var(--r-pill);
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text-mid);
  transition: all var(--dur) var(--ease);
}
.seg__item:hover { color: var(--text-strong); }
.seg__item.active {
  background: #fff;
  color: var(--text-strong);
  box-shadow: var(--sh-1);
}
</style>