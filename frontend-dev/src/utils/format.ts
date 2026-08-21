/* ==========================================================================
   utils/format.ts — 格式化 / 颜色 / 头像工具（与 frontend-preview mock.js 对齐）
   ========================================================================== */
import { locale } from '@/i18n'

const isEn = (): boolean => locale.value === 'en'

export function esc(s: unknown): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function pad(n: number): string {
  return n < 10 ? '0' + n : String(n)
}

export function fmtMoney(n: number): string {
  const neg = n < 0
  const v = Math.abs(n)
  const s = v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return (neg ? '-' : '') + s
}

export function money(n: number): string {
  return '¥' + fmtMoney(n)
}

export function fmtNum(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export function fmtDate(ts: number, withTime?: boolean): string {
  const d = new Date(ts)
  let s = isEn() ? d.getMonth() + 1 + '/' + d.getDate() : d.getMonth() + 1 + '月' + d.getDate() + '日'
  if (withTime) s += ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes())
  return s
}

export function fmtTime(ts: number): string {
  const d = new Date(ts)
  return pad(d.getHours()) + ':' + pad(d.getMinutes())
}

export function timeAgo(ts: number): string {
  const diff = (Date.now() - ts) / 1000
  if (diff < 60) return isEn() ? 'just now' : '刚刚'
  if (diff < 3600) return isEn() ? Math.floor(diff / 60) + ' min ago' : Math.floor(diff / 60) + ' 分钟前'
  if (diff < 86400) return isEn() ? Math.floor(diff / 3600) + ' h ago' : Math.floor(diff / 3600) + ' 小时前'
  if (diff < 86400 * 30) return isEn() ? Math.floor(diff / 86400) + ' d ago' : Math.floor(diff / 86400) + ' 天前'
  return fmtDate(ts)
}

export function hexA(hex: string, a: number): string {
  let h = String(hex).replace('#', '')
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')'
}

/* 名称 → 确定性柔和色板 */
const AVATAR_COLORS = ['#1a73e8', '#7c3aed', '#0ea5e9', '#10b981', '#f59e0b', '#e11d48', '#06b6d4', '#8b5cf6', '#ef4444', '#14b8a6']

export function colorOf(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

export function initialsOf(name: string): string {
  const parts = String(name).trim().split(/\s+/)
  if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase()
  return String(name).slice(0, 2).toUpperCase()
}

/* 确定性伪随机（同种子同序列，用于 identicon / 热力图） */
export function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* 确定性 identicon：5×5 对称网格 SVG data-URI */
export function identicon(name: string, size = 80): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 33 + name.charCodeAt(i)) >>> 0
  const rnd = mulberry32(h)
  const base = colorOf(name)
  const cells: string[] = []
  for (let i = 0; i < 25; i++) {
    if (rnd() > 0.62) continue
    let r = i % 5
    const c = (i / 5) | 0
    if (r > 2) r = 4 - r
    cells.push('M' + (r * 20 + 2) + ' ' + (c * 20 + 2) + 'h16v16H' + (r * 20 + 2) + 'z')
  }
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 100 100">' +
    '<rect width="100" height="100" rx="22" fill="' + base + '"/>' +
    '<g fill="#fff" opacity="0.92">' + cells.join('') + '</g></svg>'
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}