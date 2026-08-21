/* ==========================================================================
   i18n — 轻量本地化：zh 为源语言（key 即中文文案），en 字典做映射
   用法：import { t } from '@/i18n'；模板直接 {{ t('个人主页') }}
   插值：t('已接入 {n} 个 Agent', { n: 4 })
   ========================================================================== */
import { ref } from 'vue'
import en from './en'

export type Locale = 'zh' | 'en'

const KEY = 'resolve.locale'

export const locale = ref<Locale>((localStorage.getItem(KEY) as Locale) || 'zh')

export function setLocale(l: Locale): void {
  locale.value = l
  try {
    localStorage.setItem(KEY, l)
  } catch {
    /* ignore quota / privacy mode */
  }
  document.documentElement.lang = l === 'zh' ? 'zh-CN' : 'en'
}

export function t(key: string, params?: Record<string, string | number>): string {
  let s: string | undefined
  if (locale.value === 'en') s = (en as Record<string, string>)[key]
  if (s === undefined) s = key
  if (params) {
    for (const k of Object.keys(params)) {
      s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), String(params[k]))
    }
  }
  return s
}

export const localeLabel = (): string => (locale.value === 'zh' ? '中文' : 'English')

export const isEn = (): boolean => locale.value === 'en'

/* 初始化：应用 <html lang> */
setLocale(locale.value)
