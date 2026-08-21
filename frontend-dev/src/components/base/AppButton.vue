<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/icons/AppIcon.vue'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark' | 'outline'
type Size = 'sm' | 'md' | 'lg' | 'block'

const props = withDefaults(
  defineProps<{
    variant?: Variant
    size?: Size
    icon?: string
    brandIcon?: string
    loading?: boolean
    disabled?: boolean
    type?: 'button' | 'submit'
  }>(),
  { variant: 'secondary', size: 'md', type: 'button' },
)

const emit = defineEmits<{ (e: 'click', ev: MouseEvent): void }>()

const cls = computed(() => ['btn', 'btn--' + props.variant, 'btn--' + props.size, { 'is-loading': props.loading }])

function onClick(ev: MouseEvent) {
  if (props.disabled || props.loading) return
  emit('click', ev)
}
</script>

<template>
  <button :class="cls" :type="type" :disabled="disabled || loading" @click="onClick">
    <span v-if="loading" class="btn-spinner" aria-hidden="true" />
    <AppIcon v-else-if="brandIcon" :name="brandIcon" brand :size="size === 'sm' ? 15 : 17" />
    <AppIcon v-else-if="icon" :name="icon" :size="size === 'sm' ? 15 : 17" />
    <span v-if="$slots.default" class="btn-label"><slot /></span>
  </button>
</template>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border-radius: 10px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  transition: all var(--dur) var(--ease);
  user-select: none;
}
.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.btn-label {
  font-family: var(--font-body);
}

/* 尺寸 */
.btn--sm { padding: 0 12px; height: 30px; font-size: 12.5px; }
.btn--md { padding: 0 18px; height: 38px; font-size: 13.5px; }
.btn--lg { padding: 0 24px; height: 46px; font-size: 15px; }
.btn--block { width: 100%; padding: 0 18px; height: 42px; font-size: 14px; }

/* 变体 */
.btn--primary {
  background: var(--brand);
  color: #fff;
  box-shadow: var(--sh-brand);
}
.btn--primary:hover { background: var(--brand-hover); transform: translateY(-1px); }
.btn--primary:active { background: var(--brand-active); transform: none; }

.btn--secondary {
  background: var(--surface);
  color: var(--text-strong);
  border: 1px solid var(--border-strong);
  box-shadow: var(--sh-1);
}
.btn--secondary:hover { background: var(--surface-hover); border-color: rgba(17, 24, 39, 0.2); }

.btn--ghost {
  background: transparent;
  color: var(--text-mid);
}
.btn--ghost:hover { background: var(--surface-hover); color: var(--text-strong); }

.btn--outline {
  background: transparent;
  color: var(--brand);
  border: 1px solid var(--brand-line);
}
.btn--outline:hover { background: var(--brand-soft); }

.btn--danger {
  background: var(--danger);
  color: #fff;
  box-shadow: 0 6px 18px rgba(239, 68, 68, 0.24);
}
.btn--danger:hover { filter: brightness(0.96); }

.btn--dark {
  background: var(--surface-code);
  color: #fff;
}
.btn--dark:hover { background: #1c1f27; }

.btn-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
.btn--secondary .btn-spinner,
.btn--ghost .btn-spinner {
  border-color: rgba(17, 24, 39, 0.18);
  border-top-color: var(--brand);
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>