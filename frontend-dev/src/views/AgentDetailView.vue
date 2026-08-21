<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMarketStore } from '@/stores/market'
import { useWalletStore } from '@/stores/wallet'
import { useUiStore } from '@/stores/ui'
import AppIcon from '@/components/icons/AppIcon.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppCard from '@/components/base/AppCard.vue'
import AppTag from '@/components/base/AppTag.vue'
import AppModal from '@/components/base/AppModal.vue'
import Rating from '@/components/base/Rating.vue'
import StatusDot from '@/components/base/StatusDot.vue'
import EmptyState from '@/components/base/EmptyState.vue'
import { t } from '@/i18n'
import { fmtNum, hexA, identicon, money } from '@/utils/format'
import type { MarketItem } from '@/types'

const route = useRoute()
const router = useRouter()
const market = useMarketStore()
const wallet = useWalletStore()
const ui = useUiStore()

const item = computed(() => market.items.find((m) => m.id === route.params.id))

const related = computed(() => (item.value ? market.items.filter((m) => m.cat === item.value!.cat && m.id !== item.value!.id).slice(0, 3) : []))

const prompt = ref('')
const calling = ref(false)
const callOpen = ref(false)

function estCost(m: MarketItem): number {
  return m.priceNum >= 1 ? +(m.priceNum / 100).toFixed(2) : +(m.priceNum * 18).toFixed(2)
}

async function doCall() {
  if (!item.value) return
  const est = estCost(item.value)
  if (wallet.wallet.balance < est) {
    ui.toast({ type: 'warn', title: t('余额不足'), desc: t('本次调用预计约 {e}', { e: money(est) }), action: { label: t('去充值'), onClick: () => router.push('/wallet') } })
    return
  }
  if (!prompt.value.trim()) {
    ui.toast({ type: 'warn', title: t('请先输入任务描述') })
    return
  }
  calling.value = true
  try {
    const r = await market.runCall(item.value, prompt.value.trim())
    ui.toast({ type: 'success', title: t('调用完成'), desc: t('{n} 本次费用 {c}', { n: r.name, c: money(r.finalCost) }) })
    callOpen.value = false
  } finally {
    calling.value = false
  }
}

function collect() {
  ui.toast({ type: 'success', title: t('已收藏'), desc: t('{n} 已加入收藏，可在后续版本中查看', { n: item.value?.name || '' }) })
}
</script>

<template>
  <div class="page">
    <EmptyState
      v-if="!item"
      icon="help-circle"
      :title="t('未找到该 Agent')"
      :desc="t('商品可能已下架或链接有误。')"
      :action-text="t('返回市场')"
      @action="router.push('/market')"
    />

    <template v-else>
      <div class="page-head">
        <div>
          <button class="back" @click="router.push('/market')">
            <AppIcon name="chev-left" :size="15" />
            <span>{{ t('返回市场') }}</span>
          </button>
        </div>
      </div>

      <AppCard pad="lg" class="hero-card">
        <div class="hero">
          <span class="hero__brand" :style="{ background: hexA(item.accent, 0.12) }">
            <AppIcon :name="item.icon" :size="30" />
          </span>
          <div class="hero__info">
            <div class="hero__name-row">
              <h2 class="hero__name">{{ item.name }}</h2>
              <StatusDot :status="item.online ? 'online' : 'offline'" :label="item.online ? t('在线') : t('维护中')" />
              <AppTag v-if="item.featured" variant="brand">{{ t('推荐') }}</AppTag>
            </div>
            <div class="hero__vendor">
              <img class="hero__vendor-avatar" :src="identicon(item.vendorGithub, 64)" alt="" />
              <span>{{ item.vendor }}</span>
              <span class="hero__gh">@{{ item.vendorGithub }}</span>
            </div>
            <div class="hero__meta">
              <Rating :value="item.rating" />
              <span class="num">{{ item.rating.toFixed(1) }}</span>
              <span class="hero__sep" />
              <span class="num">{{ fmtNum(item.orders) }}</span>
              <span>{{ t('次调用') }}</span>
            </div>
          </div>
          <div class="hero__buy">
            <div class="hero__price num">{{ item.price }}</div>
            <div class="hero__price-note">{{ t('按实际用量计费') }}</div>
            <AppButton variant="primary" size="block" icon="zap" @click="callOpen = true">{{ t('立即调用') }}</AppButton>
            <AppButton variant="ghost" size="block" icon="heart" @click="collect">{{ t('收藏') }}</AppButton>
          </div>
        </div>
      </AppCard>

      <div class="grid grid-main-side main-grid">
        <div class="stack stack-16">
          <AppCard>
            <template #head>
              <div class="card-title"><AppIcon name="info" :size="16" class="ico" /><span>{{ t('简介') }}</span></div>
            </template>
            <p class="desc">{{ item.desc }}</p>
            <div class="tag-row">
              <AppTag v-for="t in item.tags" :key="t">{{ t }}</AppTag>
            </div>
          </AppCard>

          <AppCard>
            <template #head>
              <div class="card-title"><AppIcon name="cpu" :size="16" class="ico" /><span>{{ t('可用模型') }}</span></div>
            </template>
            <div class="models">
              <AppTag v-for="m in item.models" :key="m" variant="weak" class="mono-chip">{{ m }}</AppTag>
            </div>
          </AppCard>

          <AppCard>
            <template #head>
              <div class="card-title"><AppIcon name="gauge" :size="16" class="ico" /><span>{{ t('服务承诺') }}</span></div>
            </template>
            <div class="sla">
              <span class="sla__ico"><AppIcon name="shield" :size="18" /></span>
              <div>
                <div class="sla__text">{{ item.sla }}</div>
                <div class="sla__sub">{{ t('超出承诺响应时间可申请退费，结算以实际 token 用量为准') }}</div>
              </div>
            </div>
          </AppCard>
        </div>

        <div class="stack stack-16">
          <AppCard>
            <template #head>
              <div class="card-title"><AppIcon name="coins" :size="16" class="ico" /><span>{{ t('计费说明') }}</span></div>
            </template>
            <div class="bill">
              <div class="bill__row"><span>{{ t('计价单位') }}</span><b class="num">{{ item.price }}</b></div>
              <div class="bill__row"><span>{{ t('预估单次调用') }}</span><b class="num">{{ money(estCost(item)) }}</b></div>
              <div class="bill__row"><span>{{ t('结算周期') }}</span><b>{{ t('实时 · 余额') }}</b></div>
              <div class="bill__row"><span>{{ t('退款政策') }}</span><b>{{ t('响应超时全额退') }}</b></div>
            </div>
          </AppCard>

          <AppCard>
            <template #head>
              <div class="card-title"><AppIcon name="user" :size="16" class="ico" /><span>{{ t('服务商') }}</span></div>
            </template>
            <div class="vendor">
              <img class="vendor__avatar" :src="identicon(item.vendorGithub, 96)" alt="" />
              <div class="vendor__main">
                <div class="vendor__name">{{ item.vendor }}</div>
                <div class="vendor__gh">github.com/{{ item.vendorGithub }}</div>
              </div>
            </div>
          </AppCard>
        </div>
      </div>

      <AppCard v-if="related.length" pad="none" class="rel-card">
        <template #head>
          <div class="card-title"><AppIcon name="layers" :size="16" class="ico" /><span>{{ t('同类推荐') }}</span></div>
        </template>
        <div class="rel-list">
          <button
            v-for="r in related"
            :key="r.id"
            type="button"
            class="rel"
            @click="router.push('/market/' + r.id)"
          >
            <span class="rel__brand" :style="{ background: hexA(r.accent, 0.12) }">
              <AppIcon :name="r.icon" :size="18" />
            </span>
            <span class="rel__main">
              <span class="rel__name">{{ r.name }}</span>
              <span class="rel__meta">{{ r.vendor }} · <Rating :value="r.rating" /></span>
            </span>
            <span class="rel__price num">{{ r.price }}</span>
            <AppIcon name="chev-right" :size="15" class="rel__arrow" />
          </button>
        </div>
      </AppCard>

      <AppModal :model-value="callOpen" :title="item.name" :subtitle="t('给 {n} 的任务描述', { n: item.name })" :width="480" @update:model-value="(v: boolean) => (callOpen = v)">
        <div class="call">
          <div class="call__est">
            <AppIcon name="coins" :size="17" />
            <span>{{ t('预估 {e} · 余额 {b}', { e: money(estCost(item)), b: money(wallet.wallet.balance) }) }}</span>
          </div>
          <textarea v-model="prompt" class="call__prompt" rows="4" :placeholder="t('描述你要完成的任务…')" />
        </div>
        <template #footer>
          <AppButton variant="ghost" @click="callOpen = false">{{ t('取消') }}</AppButton>
          <AppButton variant="primary" icon="send" :loading="calling" @click="doCall">{{ t('开始调用') }}</AppButton>
        </template>
      </AppModal>
    </template>
  </div>
</template>

<style scoped>
.back {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: var(--text-mid);
  padding: 5px 8px;
  margin: -5px -8px 2px;
  border-radius: 8px;
  transition: all var(--dur) var(--ease);
}
.back:hover { color: var(--brand); background: var(--brand-soft); }

.hero { display: flex; align-items: flex-start; gap: 20px; }
.hero__brand {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}
.hero__info { flex: 1 1 auto; min-width: 0; }
.hero__name-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.hero__name { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
.hero__vendor { display: flex; align-items: center; gap: 8px; margin-top: 10px; font-size: 13px; color: var(--text-mid); }
.hero__vendor-avatar { width: 22px; height: 22px; border-radius: 50%; }
.hero__gh { color: var(--text-faint); font-size: 12px; }
.hero__meta { display: flex; align-items: center; gap: 8px; margin-top: 12px; font-size: 12.5px; color: var(--text-mid); }
.hero__sep { width: 1px; height: 12px; background: var(--border-strong); }
.hero__buy { display: flex; flex-direction: column; gap: 9px; flex: 0 0 auto; width: 200px; }
.hero__price { font-size: 24px; font-weight: 700; color: var(--text-strong); }
.hero__price-note { font-size: 11.5px; color: var(--text-faint); margin: -4px 0 2px; }

.desc { font-size: 13.5px; color: var(--text-mid); line-height: 1.75; }
.tag-row { display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap; }
.models { display: flex; gap: 8px; flex-wrap: wrap; }
.mono-chip { font-family: var(--font-mono); font-size: 12px; }

.sla { display: flex; gap: 12px; align-items: flex-start; }
.sla__ico {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--brand);
  background: var(--brand-soft);
  flex: 0 0 auto;
}
.sla__text { font-size: 13.5px; font-weight: 600; color: var(--text-strong); }
.sla__sub { margin-top: 4px; font-size: 12px; color: var(--text-weak); }

.bill { display: flex; flex-direction: column; }
.bill__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 0;
  font-size: 13px;
  color: var(--text-mid);
  border-bottom: 1px dashed var(--border);
}
.bill__row:last-child { border-bottom: none; }
.bill__row b { color: var(--text-strong); }

.vendor { display: flex; align-items: center; gap: 12px; }
.vendor__avatar { width: 42px; height: 42px; border-radius: 12px; }
.vendor__name { font-size: 14px; font-weight: 600; color: var(--text-strong); }
.vendor__gh { margin-top: 3px; font-size: 12px; color: var(--text-faint); font-family: var(--font-mono); }

.rel-card { margin-top: 16px; }
.rel-list { padding: 4px 8px; display: flex; flex-direction: column; }
.rel {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 10px;
  border-radius: 12px;
  text-align: left;
  transition: background var(--dur) var(--ease);
}
.rel:hover { background: var(--surface-hover); }
.rel__brand {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}
.rel__main { flex: 1 1 auto; min-width: 0; }
.rel__name { font-size: 13px; font-weight: 600; color: var(--text-strong); display: block; }
.rel__meta { margin-top: 3px; display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-faint); }
.rel__price { font-size: 13px; font-weight: 600; color: var(--text-strong); }
.rel__arrow { color: var(--text-faint); }

.call__est {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-mid);
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 13px;
}
.call__est :deep(.ico) { color: var(--brand); }
.call__est b { color: var(--text-strong); }
.call__prompt {
  margin-top: 12px;
  width: 100%;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  padding: 12px 14px;
  font-size: 13.5px;
  color: var(--text-strong);
  line-height: 1.6;
  resize: vertical;
  outline: none;
  transition: border-color var(--dur) var(--ease), box-shadow var(--dur) var(--ease);
}
.call__prompt:focus {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px var(--brand-soft);
}

.main-grid { margin-top: 16px; }

@media (max-width: 700px) {
  .hero { flex-direction: column; }
  .hero__buy { width: 100%; }
}
</style>