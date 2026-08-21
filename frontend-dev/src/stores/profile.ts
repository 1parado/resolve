import { defineStore } from 'pinia'
import { ref } from 'vue'
import { profileApi } from '@/api'
import { genHeatmap, getData, stats } from '@/mock'
import type { Agent, Billing, HeatStat, NodeInfo, Profile } from '@/types'

export const useProfileStore = defineStore('profile', () => {
  const data = () => getData()

  const profile = ref<Profile>({ ...data().profile })
  const agents = ref<Agent[]>(data().agents.map((a) => ({ ...a })))
  const node = ref<NodeInfo>({ ...data().node })
  const heatmap = ref<number[]>(genHeatmap())
  const stat = ref<HeatStat>(stats())
  const loading = ref(false)

  function sync() {
    profile.value = { ...data().profile }
    agents.value = data().agents.map((a) => ({ ...a }))
    node.value = { ...data().node }
    heatmap.value = genHeatmap()
    stat.value = stats()
  }

  async function refresh() {
    loading.value = true
    try {
      const r = await profileApi.fetch()
      profile.value = r.profile
      agents.value = r.agents
      node.value = r.node
      heatmap.value = r.heatmap
      stat.value = r.stats
    } finally {
      loading.value = false
    }
  }

  async function edit(patch: Partial<Profile>) {
    profile.value = await profileApi.update(patch)
    sync()
  }

  async function publish(patch: Partial<NodeInfo>) {
    node.value = await profileApi.publishNode(patch)
    sync()
  }

  function recentBilling(top = 5): Billing[] {
    return data().billing.slice(0, top)
  }

  return { profile, agents, node, heatmap, stat, loading, sync, refresh, edit, publish, recentBilling }
})