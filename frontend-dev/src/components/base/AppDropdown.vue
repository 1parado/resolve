<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import AppIcon from '@/components/icons/AppIcon.vue'

export interface DropdownItem {
  label: string
  icon?: string
  danger?: boolean
  onClick: () => void
}

const props = withDefaults(
  defineProps<{
    items: DropdownItem[]
    align?: 'right' | 'left'
  }>(),
  { align: 'left' },
)

const open = ref(false)
const root = ref<HTMLElement>()

function onDocClick(e: MouseEvent) {
  if (!root.value?.contains(e.target as Node)) open.value = false
}

onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))

function pick(item: DropdownItem) {
  open.value = false
  item.onClick()
}
</script>

<template>
  <div ref="root" class="dd">
    <span class="dd__trigger" @click.stop="open = !open">
      <slot />
    </span>
    <Transition name="dd-pop">
      <div v-if="open" class="dd__menu" :class="'align-' + align" role="menu">
        <button
          v-for="(item, i) in items"
          :key="i"
          type="button"
          class="dd__item"
          :class="{ danger: item.danger }"
          role="menuitem"
          @click="pick(item)"
        >
          <AppIcon v-if="item.icon" :name="item.icon" :size="15" />
          <span>{{ item.label }}</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.dd { position: relative; display: inline-flex; }
.dd__trigger { display: inline-flex; cursor: pointer; }
.dd__menu {
  position: absolute;
  top: calc(100% + 8px);
  min-width: 168px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--sh-pop);
  padding: 6px;
  z-index: var(--z-dropdown);
}
.align-left { left: 0; }
.align-right { right: 0; }
.dd__item {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 9px 11px;
  border-radius: 8px;
  font-size: 12.5px;
  color: var(--text-mid);
  text-align: left;
  transition: all var(--dur) var(--ease);
}
.dd__item:hover { background: var(--surface-hover); color: var(--text-strong); }
.dd__item.danger { color: var(--danger); }
.dd__item.danger:hover { background: var(--danger-soft); }

.dd-pop-enter-active { transition: opacity 0.14s var(--ease), transform 0.14s var(--ease-out); }
.dd-pop-enter-from { opacity: 0; transform: translateY(-4px) scale(0.98); }
.dd-pop-leave-active { transition: opacity 0.1s var(--ease); }
.dd-pop-leave-to { opacity: 0; }
</style>