import { defineStore } from 'pinia'
import { ref } from 'vue'
import { walletApi } from '@/api'
import { getData } from '@/mock'
import type { Billing, Wallet } from '@/types'

export const useWalletStore = defineStore('wallet', () => {
  const data = () => getData()

  const wallet = ref<Wallet>({ ...data().wallet })
  const billing = ref<Billing[]>([...data().billing])

  function sync() {
    wallet.value = { ...data().wallet }
    billing.value = [...data().billing]
  }

  /** 从后端拉取钱包数据 */
  async function refresh() {
    const r = await walletApi.fetch()
    wallet.value = r.wallet
    billing.value = r.billing
  }

  async function recharge(amount: number, method: string) {
    const r = await walletApi.recharge(amount, method)
    wallet.value = { balance: r.wallet.balance, monthCost: r.wallet.monthCost }
    billing.value = r.billing
  }

  async function withdraw(amount: number) {
    const r = await walletApi.withdraw(amount)
    wallet.value = { balance: r.balance, monthCost: r.monthCost }
    sync()
  }

  async function spend(amount: number, agent: string) {
    const r = await walletApi.spend(amount, agent)
    wallet.value = { balance: r.balance, monthCost: r.monthCost }
    sync()
  }

  return { wallet, billing, sync, refresh, recharge, withdraw, spend }
})