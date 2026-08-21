<script setup lang="ts">
import AppIcon from '@/components/icons/AppIcon.vue'

interface TabOption {
  value: string
  label: string
  icon?: string
}

const props = withDefaults(
  defineProps<{
    modelValue: string
    options: TabOption[]
    variant?: 'underline' | 'pill'
  }>(),
  { variant: 'underline' },
)

const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()
</script>

<template>
  <div class="tabs" :class="'tabs--' + variant" role="tablist">
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      class="tabs__item"
      :class="{ active: modelValue === opt.value }"
      role="tab"
      :aria-selected="modelValue === opt.value"
      @click="emit('update:modelValue', opt.value)"
    >
      <AppIcon v-if="opt.icon" :name="opt.icon" :size="15" />
      <span>{{ opt.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.tabs {
  display: inline-flex;
  gap: 4px;
}
.tabs__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-mid);
  border-radius: 8px;
  transition: all var(--dur) var(--ease);
}
.tabs__item:hover { color: var(--text-strong); }

/* underline */
.tabs--underline .tabs__item { position: relative; border-radius: 0; }
.tabs--underline .tabs__item.active { color: var(--brand); }
.tabs--underline .tabs__item.active::after {
  content: '';
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: -1px;
  height: 2px;
  border-radius: 2px;
  background: var(--brand);
}

/* pill */
.tabs--pill .tabs__item.active {
  background: var(--brand-soft);
  color: var(--brand);
}
</style>