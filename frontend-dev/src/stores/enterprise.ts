import { defineStore } from 'pinia'
import { ref } from 'vue'
import { enterpriseApi } from '@/api'
import { getData } from '@/mock'
import type { Enterprise, Member, MemberRole } from '@/types'

export const useEnterpriseStore = defineStore('enterprise', () => {
  const ent = ref<Enterprise>({ ...getData().enterprise, members: [...getData().enterprise.members] })

  function sync() {
    const e = getData().enterprise
    ent.value = { ...e, members: [...e.members] }
  }

  async function callMember(memberId: string, agent: string, prompt: string) {
    const r = await enterpriseApi.callMember(memberId, agent, prompt)
    sync()
    return r
  }

  async function setSetting(key: string, value: boolean | string) {
    ent.value.settings[key] = value
    await enterpriseApi.setSetting(key, value)
  }

  async function updateBasic(patch: Partial<{ name: string; seats: number }>) {
    const r = await enterpriseApi.updateBasic(patch)
    ent.value.name = r.name
    ent.value.seats = r.seats
  }

  async function updateMember(id: string, patch: Partial<Member>) {
    await enterpriseApi.updateMember(id, patch)
    sync()
  }

  async function setMemberRole(id: string, role: MemberRole) {
    await enterpriseApi.setMemberRole(id, role)
    sync()
  }

  async function removeMember(id: string) {
    await enterpriseApi.removeMember(id)
    sync()
  }

  return { ent, sync, callMember, setSetting, updateBasic, updateMember, setMemberRole, removeMember }
})