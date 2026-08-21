<script setup lang="ts">
import { useUiStore } from '@/stores/ui'
import AppIcon from '@/components/icons/AppIcon.vue'

const ui = useUiStore()

const TYPE_ICON: Record<string, string> = {
  success: 'check-circle',
  info: 'info',
  error: 'alert',
  warn: 'alert',
}
</script>

<template>
  <Teleport to="body">
    <TransitionGroup name="toast" tag="div" class="toast-host">
      <div v-for="t in ui.toasts" :key="t.id" class="toast" :class="'is-' + t.type" role="status">
        <span class="toast__bar" />
        <AppIcon :name="TYPE_ICON[t.type] || 'info'" :size="17" class="toast__icon" />
        <div class="toast__body">
          <div class="toast__title">{{ t.title }}</div>
          <div v-if="t.desc" class="toast__desc">{{ t.desc }}</div>
        </div>
        <button v-if="t.action" type="button" class="toast__action" @click="t.action?.onClick">
          {{ t.action.label }}
        </button>
        <button class="toast__close" aria-label="关闭" @click="ui.dismiss(t.id)">
          <AppIcon name="x" :size="13" />
        </button>
      </div>
    </TransitionGroup>
  </Teleport>
</template>

<style scoped>
.toast-host {
  position: fixed;
  top: 74px;
  right: 20px;
  z-index: var(--z-toast);
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
  max-width: min(380px, calc(100vw - 40px));
}
.toast {
  pointer-events: auto;
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--sh-pop);
  padding: 13px 14px;
  overflow: hidden;
}
.toast__bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--brand);
}
.toast.is-success .toast__bar { background: var(--success); }
.toast.is-error .toast__bar { background: var(--danger); }
.toast.is-warn .toast__bar { background: var(--warn); }
.toast__icon { color: var(--brand); margin-top: 1px; }
.toast.is-success .toast__icon { color: var(--success); }
.toast.is-error .toast__icon { color: var(--danger); }
.toast.is-warn .toast__icon { color: var(--warn); }
.toast__body { flex: 1 1 auto; min-width: 0; }
.toast__title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-strong);
}
.toast__desc {
  margin-top: 2px;
  font-size: 12px;
  color: var(--text-weak);
  line-height: 1.55;
}
.toast__action {
  flex: 0 0 auto;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--brand);
  padding: 3px 6px;
  border-radius: 6px;
}
.toast__action:hover { background: var(--brand-soft); }
.toast__close {
  flex: 0 0 auto;
  color: var(--text-faint);
  padding: 3px;
  border-radius: 6px;
}
.toast__close:hover { color: var(--text-strong); background: var(--surface-hover); }

.toast-enter-active { transition: all 0.24s var(--ease-out); }
.toast-enter-from { opacity: 0; transform: translateX(16px) scale(0.97); }
.toast-leave-active { transition: all 0.18s var(--ease); }
.toast-leave-to { opacity: 0; transform: translateX(10px); }

@media (max-width: 700px) {
  .toast-host {
    top: auto;
    bottom: calc(var(--tabbar-h) + 14px);
    right: 12px;
    left: 12px;
    max-width: none;
  }
}
</style>