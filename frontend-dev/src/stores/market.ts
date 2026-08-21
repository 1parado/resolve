import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { marketApi } from '@/api'
import { getData } from '@/mock'
import { useWalletStore } from './wallet'
import type { MarketCat, MarketItem } from '@/types'

const CATS: { value: MarketCat | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'code', label: '代码生成' },
  { value: 'reason', label: '深度推理' },
  { value: 'ops', label: '本地算力' },
  { value: 'content', label: '内容创作' },
  { value: 'data', label: '数据分析' },
  { value: 'design', label: '设计视觉' },
]

export const useMarketStore = defineStore('market', () => {
  const items = ref<MarketItem[]>(getData().marketplace.map((m) => ({ ...m })))
  const query = ref('')
  const cat = ref<MarketCat | 'all'>('all')
  const sort = ref<'reco' | 'price' | 'orders'>('reco')

  const filtered = computed(() => {
    let list = [...items.value]
    if (query.value.trim()) {
      const q = query.value.trim().toLowerCase()
      list = list.filter((m) => (m.name + m.vendor + m.tags.join('')).toLowerCase().includes(q))
    }
    if (cat.value !== 'all') list = list.filter((m) => m.cat === cat.value)
    if (sort.value === 'price') list.sort((a, b) => a.priceNum - b.priceNum)
    else if (sort.value === 'orders') list.sort((a, b) => b.orders - a.orders)
    else list.sort((a, b) => Number(b.featured || false) - Number(a.featured || false))
    return list
  })

  function setQuery(v: string) {
    query.value = v
  }
  function setCat(v: MarketCat | 'all') {
    cat.value = v
  }
  function setSort(v: 'reco' | 'price' | 'orders') {
    sort.value = v
  }

  async function runCall(item: MarketItem, prompt: string) {
    const r = await marketApi.call(item.id, prompt)
    useWalletStore().sync()
    return r
  }

  function addItem(item: MarketItem) {
    items.value.unshift(item)
  }

  return { items, query, cat, sort, filtered, CATS, setQuery, setCat, setSort, runCall, addItem }
})