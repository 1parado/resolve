<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMarketStore } from '@/stores/market'
import { useWalletStore } from '@/stores/wallet'
import { useUiStore } from '@/stores/ui'
import AppIcon from '@/components/icons/AppIcon.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppCard from '@/components/base/AppCard.vue'
import AppTag from '@/components/base/AppTag.vue'
import AppTabs from '@/components/base/AppTabs.vue'
import AppSegmented from '@/components/base/AppSegmented.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppModal from '@/components/base/AppModal.vue'
import Rating from '@/components/base/Rating.vue'
import EmptyState from '@/components/base/EmptyState.vue'
import { fmtNum, hexA, identicon, money } from '@/utils/format'
import type { MarketItem } from '@/types'

const router = useRouter()
const market = useMarketStore()
const wallet = useWalletStore()
const ui = useUiStore()

const callTarget = ref<MarketItem | null>(null)
const prompt = ref('')
const calling = ref(false)

const SORTS = [
  { value: 'reco', label: '综合' },
  { value: 'price', label: '低价' },
  { value: 'orders', label: '热门' },
]

function estCost(m: MarketItem): number {
  return m.priceNum >= 1 ? +(m.priceNum / 100).toFixed(2) : +(m.priceNum * 18).toFixed(2)
}

function openCall(m: MarketItem) {
  callTarget.value = m
  prompt.value = ''
}

async function doCall() {
  if (!callTarget.value) return
  const est = estCost(callTarget.value)
  if (wallet.wallet.balance < est) {
    ui.toast({
      type: 'warn',
      title: '余额不足',
      desc: '本次调用预计约 ' + money(est) + '，当前余额 ' + money(wallet.wallet.balance),
      action: { label: '去充值', onClick: () => router.push('/wallet') },
    })
    return
  }
  if (!prompt.value.trim()) {
    ui.toast({ type: 'warn', title: '请先输入任务描述' })
    return
  }
  calling.value = true
  try {
    const r = await market.runCall(callTarget.value, prompt.value.trim())
    ui.toast({ type: 'success', title: '调用完成', desc: r.name + ' 本次费用 ' + money(r.finalCost) })
    callTarget.value = null
  } finally {
    calling.value = false
  }
}

const catOptions = computed(() => market.CATS.map((c) => ({ value: c.value, label: c.label })))
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1 class="page-title">Agent 市场</h1>
        <p class="page-sub">跨团队调用各类 Agent，按 token 按次计费，用多少付多少</p>
      </div>
      <div class="head-actions">
        <AppButton icon="plus" @click="router.push('/market/publish')">上架 Agent</AppButton>
      </div>
    </div>

    <div class="toolbar">
      <div class="toolbar__search">
        <AppIcon name="search" :size="16" class="toolbar__search-ico" />
        <AppInput v-model="market.query" placeholder="搜索名称、厂商或标签" />
      </div>
      <AppSegmented :model-value="market.sort" :options="SORTS" @update:model-value="market.setSort($event as any)" />
    </div>

    <AppTabs
      :model-value="market.cat"
      :options="catOptions"
      variant="pill"
      class="cat-tabs"
      @update:model-value="market.setCat($event as any)"
    />

    <div v-if="market.filtered.length" class="grid grid-3">
      <AppCard v-for="m in market.filtered" :key="m.id" :hover="true" class="m-card" @click="router.push('/market/' + m.id)">
        <div class="m-card__top">
          <span class="m-card__brand" :style="{ background: hexA(m.accent, 0.12) }">
            <AppIcon :name="m.icon" :brand="!!m.icon" :size="20" />
          </span>
          <div class="m-card__info">
            <div class="m-card__name">
              {{ m.name }}
              <AppTag v-if="m.featured" variant="brand" class="tag-feat">推荐</AppTag>
            </div>
            <div class="m-card__vendor">{{ m.vendor }}</div>
          </div>
          <span class="m-card__dot" :title="m.online ? '在线' : '维护中'" :class="{ off: !m.online }" />
        </div>
        <div class="m-card__tags">
          <AppTag v-for="t in m.tags.slice(0, 3)" :key="t" variant="weak" class="tag-sm">{{ t }}</AppTag>
        </div>
        <div class="m-card__foot">
          <div class="m-card__price num">{{ m.price }}</div>
          <div class="m-card__meta">
            <Rating :value="m.rating" />
            <span class="m-card__orders num">{{ fmtNum(m.orders) }} 次调用</span>
          </div>
        </div>
        <div class="m-card__actions">
          <AppButton
            variant="primary"
            size="sm"
            class="m-card__call"
            @click.stop="openCall(m)"
          >
            <span>调用</span>
            <AppIcon name="zap" :size="14" />
          </AppButton>
        </div>
      </AppCard>
    </div>

    <EmptyState
      v-else
      icon="search"
      title="没有匹配的 Agent"
      desc="换个关键词或分类试试。"
      action-text="清空筛选"
      @action="market.setQuery(''); market.setCat('all')"
    />

    <!-- 调用弹窗 -->
    <AppModal
      :model-value="!!callTarget"
      :title="callTarget?.name || ''"
      :subtitle="callTarget?.vendor + ' · ' + callTarget?.sla"
      :width="480"
      @update:model-value="(v: boolean) => !v && (callTarget = null)"
    >
      <div v-if="callTarget" class="call">
        <div class="call__est">
          <AppIcon name="coins" :size="17" />
          <span>本次预估价 <b class="num">{{ money(estCost(callTarget)) }}</b> · 余额 <b class="num">{{ money(wallet.wallet.balance) }}</b></span>
        </div>
        <textarea v-model="prompt" class="call__prompt" rows="4" placeholder="描述你要完成的任务，例如：把这段 Python 重构为异步实现并补充测试" />
      </div>
      <template #footer>
        <AppButton variant="ghost" @click="callTarget = null">取消</AppButton>
        <AppButton variant="primary" icon="send" :loading="calling" @click="doCall">开始调用</AppButton>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.head-actions { display: flex; gap: 10px; }
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 12px;
}
.toolbar__search { position: relative; flex: 1 1 auto; max-width: 420px; }
.toolbar__search-ico {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-faint);
  z-index: 1;
  pointer-events: none;
}
.toolbar__search :deep(.input) { padding-left: 36px; }
.cat-tabs { margin-bottom: 18px; }

.grid-3 { align-items: stretch; }
.m-card {
  display: flex;
  flex-direction: column;
  cursor: pointer;
}
.m-card__top { display: flex; align-items: center; gap: 11px; }
.m-card__brand {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}
.m-card__info { flex: 1 1 auto; min-width: 0; }
.m-card__name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-strong);
  white-space: nowrap;
  overflow: hidden;
}
.m-card__name > span:first-child { overflow: hidden; text-overflow: ellipsis; display: block; }
.m-card__vendor { margin-top: 3px; font-size: 12px; color: var(--text-faint); }
.m-card__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--success);
  flex: 0 0 auto;
}
.m-card__dot.off { background: var(--text-faint); }
.m-card__tags { margin-top: 12px; display: flex; gap: 6px; flex-wrap: wrap; }
.tag-feat { font-size: 10.5px; padding: 1px 7px; flex: 0 0 auto; }
.tag-sm { font-size: 11px; padding: 2px 8px; }
.m-card__foot {
  margin-top: auto;
  padding-top: 14px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
}
.m-card__price { font-size: 16px; font-weight: 700; color: var(--text-strong); }
.m-card__meta { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.m-card__orders { font-size: 11px; color: var(--text-faint); }
.m-card__actions { margin-top: 12px; }
.m-card__call { width: 100%; }

@media (max-width: 700px) {
  .toolbar { flex-direction: column; align-items: stretch; }
  .toolbar__search { max-width: none; }
}
</style>