import { randomUUID } from 'node:crypto'

/** 生成带前缀的 ID，如 'u_xxx'、'm_xxx' */
export function genId(prefix = ''): string {
  return prefix + randomUUID().replace(/-/g, '').slice(0, 16)
}

/** 当前时间戳（毫秒） */
export function now(): number {
  return Date.now()
}

/** 解析 JSON 字符串字段，失败返回默认值 */
export function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/** 生成近 371 天成交量热力图数据（53 列 × 7 行，与前端 ContributionHeatmap 组件对齐） */
export function genHeatmap(): number[] {
  const out: number[] = []
  for (let i = 0; i < 371; i++) {
    out.push(Math.random() > 0.55 ? Math.floor(Math.random() * 12) : 0)
  }
  return out
}