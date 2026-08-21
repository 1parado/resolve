import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface ToastItem {
  id: number
  type: 'success' | 'info' | 'error' | 'warn'
  title: string
  desc?: string
  action?: { label: string; onClick: () => void }
}

export const useUiStore = defineStore('ui', () => {
  const toasts = ref<ToastItem[]>([])
  const isMobile = ref(false)
  const sidebarCollapsed = ref(localStorage.getItem('resolve.sb.collapsed') === '1')
  let seed = 1

  function toast(opts: { type?: ToastItem['type']; title: string; desc?: string; action?: ToastItem['action'] }) {
    const id = seed++
    toasts.value.push({ id, type: opts.type || 'info', title: opts.title, desc: opts.desc, action: opts.action })
    window.setTimeout(() => dismiss(id), opts.action ? 5200 : 3200)
  }

  function dismiss(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  function setMobile(v: boolean) {
    isMobile.value = v
  }

  function setSidebar(v: boolean) {
    sidebarCollapsed.value = v
    localStorage.setItem('resolve.sb.collapsed', v ? '1' : '0')
  }

  function toggleSidebar() {
    setSidebar(!sidebarCollapsed.value)
  }

  return { toasts, toast, dismiss, isMobile, setMobile, sidebarCollapsed, setSidebar, toggleSidebar }
})