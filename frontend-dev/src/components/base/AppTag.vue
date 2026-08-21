<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/icons/AppIcon.vue'

type Variant = 'brand' | 'success' | 'warn' | 'danger' | 'default' | 'weak'

const props = withDefaults(
  defineProps<{
    variant?: Variant
    dot?: boolean
    icon?: string
    brandIcon?: string
    closable?: boolean
  }>(),
  { variant: 'default' },
)

const emit = defineEmits<{ (e: 'close'): void }>()
const cls = computed(() => ['tag', 'tag--' + props.variant])
</script>

<template>
  <span :class="cls">
    <span v-if="dot" class="tag__dot" />
    <AppIcon v-if="brandIcon" :name="brandIcon" brand :size="13" />
    <AppIcon v-else-if="icon" :name="icon" :size="13" />
    <slot />
    <button v-if="closable" class="tag__close" aria-label="移除" @click="emit('close')">
      <AppIcon name="x" :size="11" />
    </button>
  </span>
</template>

<style scoped>
.tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: var(--r-pill);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.5;
  white-space: nowrap;
}
.tag__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.85;
  flex: 0 0 auto;
}
.tag__close {
  display: inline-flex;
  align-items: center;
  padding: 0;
  margin-left: 2px;
  opacity: 0.6;
}
.tag__close:hover { opacity: 1; }

.tag--brand { color: var(--brand); background: var(--brand-soft); border: 1px solid var(--brand-line); }
.tag--success { color: var(--success); background: var(--success-soft); border: 1px solid var(--success-line); }
.tag--warn { color: #b45309; background: var(--warn-soft); border: 1px solid var(--warn-line); }
.tag--danger { color: var(--danger); background: var(--danger-soft); border: 1px solid var(--danger-line); }
.tag--default { color: var(--text-mid); background: var(--surface-soft); border: 1px solid var(--border); }
.tag--weak { color: var(--text-weak); background: transparent; border: 1px dashed var(--border-strong); }
</style>