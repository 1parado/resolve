<script setup lang="ts">
import { watch } from 'vue'
import { t } from '@/i18n'
import AppIcon from '@/components/icons/AppIcon.vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title?: string
    subtitle?: string
    width?: number
    sheet?: boolean
  }>(),
  { width: 520, sheet: false },
)

const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()

function close() {
  emit('update:modelValue', false)
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.modelValue) close()
}

watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      document.addEventListener('keydown', onKey)
      document.body.style.overflow = 'hidden'
    } else {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  },
)

defineExpose({ close })
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="modelValue" class="modal" @click.self="close">
        <Transition name="modal-pop" appear>
          <div class="modal__panel" :class="{ 'is-sheet': sheet }" :style="sheet ? {} : { width: width + 'px' }" role="dialog" aria-modal="true">
            <header v-if="title || $slots.head" class="modal__head">
              <div v-if="title" class="modal__titles">
                <h3 class="modal__title">{{ title }}</h3>
                <p v-if="subtitle" class="modal__subtitle">{{ subtitle }}</p>
              </div>
              <slot name="head" />
              <button class="modal__close" :aria-label="t('关闭')" @click="close">
                <AppIcon name="x" :size="16" />
              </button>
            </header>
            <div class="modal__body">
              <slot />
            </div>
            <footer v-if="$slots.footer" class="modal__foot">
              <slot name="footer" />
            </footer>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--overlay);
  padding: 16px;
}
.modal__panel {
  background: #fff;
  border-radius: var(--r-xl);
  box-shadow: var(--sh-pop);
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 48px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.modal__head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--border);
}
.modal__titles { flex: 1 1 auto; min-width: 0; }
.modal__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-strong);
}
.modal__subtitle {
  margin-top: 3px;
  font-size: 12px;
  color: var(--text-weak);
}
.modal__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  color: var(--text-faint);
  flex: 0 0 auto;
  transition: all var(--dur) var(--ease);
}
.modal__close:hover {
  background: var(--surface-hover);
  color: var(--text-strong);
}
.modal__body {
  padding: 20px;
  overflow-y: auto;
}
.modal__foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid var(--border);
  background: var(--surface-soft);
  border-radius: 0 0 var(--r-xl) var(--r-xl);
}
@media (max-width: 700px) {
  .modal { align-items: flex-end; padding: 0; }
  .modal__panel.is-sheet {
    width: 100% !important;
    max-width: 100%;
    max-height: 88vh;
    border-radius: 18px 18px 0 0;
  }
}
</style>