<script setup lang="ts">
import { computed, ref } from 'vue'
import { useWalletStore } from '@/stores/wallet'
import AppIcon from '@/components/icons/AppIcon.vue'
import AppCard from '@/components/base/AppCard.vue'
import AppSegmented from '@/components/base/AppSegmented.vue'
import AppTag from '@/components/base/AppTag.vue'
import EmptyState from '@/components/base/EmptyState.vue'
import { money, timeAgo } from '@/utils/format'
import type { BillingType } from '@/types'

const wallet = useWalletStore()

const type = ref<'all' | BillingType>('all')

const TYPES = [
  { value: 'all', label: '全部' },
  { value: 'call', label: '调用' },
  { value: 'recharge', label: '充值' },
  { value: 'withdraw', label: '提现' },
]

const filtered = computed(() => (type.value === 'all' ? wallet.billing : wallet.billing.filter((b) => b.type === type.value)))

const sums = computed(() => {
  let income = 0
  let expense = 0
  for (const b of wallet.billing) {
    if (b.amount > 0) income += b.amount
    else expense += -b.amount
  }
  return { income: Math.round(income * 100) / 100, expense: Math.round(expense * 100) / 100 }
})

const TYPE_LABEL: Record<BillingType, string> = { call: '调用', recharge: '充值', withdraw: '提现' }
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1 class="page-title">账单流水</h1>
        <p class="page-sub">所有充值与消费明细，支持按类型筛选</p>
      </div>
    </div>

    <div class="sum-grid">
      <div class="sum-card"><span>累计充值</span><b class="num num-up">{{ money(sums.income) }}</b></div>
      <div class="sum-card"><span>累计消费</span><b class="num num-down">{{ money(sums.expense) }}</b></div>
      <div class="sum-card"><span>本月消费</span><b class="num num-down">{{ money(wallet.wallet.monthCost) }}</b></div>
    </div>

    <AppCard pad="none" class="list-card">
      <template #head>
        <div class="card-title"><AppIcon name="list" :size="16" class="ico" /><span>明细</span></div>
        <AppSegmented :model-value="type" :options="TYPES" @update:model-value="(v: string) => (type = v as any)" />
      </template>

      <div v-if="filtered.length" class="txs">
        <div v-for="b in filtered" :key="b.id" class="list-row tx-row">
          <span class="tx-row__ico" :class="'tx-' + b.type">
            <AppIcon :name="b.type === 'call' ? 'zap' : b.type === 'recharge' ? 'coins' : 'arrow-up-right'" :size="15" />
          </span>
          <div class="list-row__main">
            <div class="list-row__title">{{ TYPE_LABEL[b.type] }} · {{ b.agent }}</div>
            <div class="list-row__sub">{{ timeAgo(b.time) }} · {{ b.method }} · <AppTag :variant="b.status === 'done' ? 'success' : 'warn'" class="st-tag">{{ b.status === 'done' ? '成功' : '处理中' }}</AppTag></div>
          </div>
          <span class="num" :class="b.amount > 0 ? 'num-up' : 'num-down'">{{ b.amount > 0 ? '+' : '' }}{{ money(b.amount) }}</span>
        </div>
      </div>
      <EmptyState v-else icon="list" title="暂无该类型流水" desc="换个筛选条件试试。" />
    </AppCard>
  </div>
</template>

<style scoped>
.sum-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 16px; }
.sum-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  box-shadow: var(--sh-1);
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sum-card span { font-size: 12px; color: var(--text-weak); }
.sum-card b { font-size: 20px; font-weight: 700; }

.txs { padding: 4px 20px 10px; }
.tx-row { padding: 13px 0; }
.tx-row__ico {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}
.tx-call { background: var(--brand-soft); color: var(--brand); }
.tx-recharge { background: var(--success-soft); color: var(--success); }
.tx-withdraw { background: var(--warn-soft); color: var(--warn); }
.st-tag { font-size: 11px; padding: 1px 7px; display: inline-flex; }

@media (max-width: 700px) {
  .sum-grid { grid-template-columns: 1fr; }
}
</style>