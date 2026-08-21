<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useProfileStore } from '@/stores/profile'
import { useWalletStore } from '@/stores/wallet'
import AppIcon from '@/components/icons/AppIcon.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import AppCard from '@/components/base/AppCard.vue'
import AppTag from '@/components/base/AppTag.vue'
import StatCard from '@/components/base/StatCard.vue'
import ContributionHeatmap from '@/components/profile/ContributionHeatmap.vue'
import { t } from '@/i18n'
import { fmtNum, hexA, identicon, money, timeAgo } from '@/utils/format'

const router = useRouter()
const auth = useAuthStore()
const profile = useProfileStore()
const wallet = useWalletStore()
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1 class="page-title">{{ t('概览') }}</h1>
        <p class="page-sub">{{ t('今天也让闲置算力变成可调用的服务') }}</p>
      </div>
      <div class="head-actions">
        <AppButton icon="plug" @click="router.push('/connect')">{{ t('接入 Agent') }}</AppButton>
        <AppButton variant="primary" icon="market" @click="router.push('/market')">{{ t('去市场逛逛') }}</AppButton>
      </div>
    </div>

    <div class="grid grid-4">
      <StatCard icon="zap" :label="t('今日成交量')" :value="profile.stat.today + t('单')" :hint="t('实时')" accent />
      <StatCard icon="trending-up" :label="t('本周成交量')" :value="profile.stat.week + t('单')" />
      <StatCard icon="check-circle" :label="t('累计成交量')" :value="fmtNum(profile.stat.total) + t('单')" />
      <StatCard icon="coins" :label="t('本月收入')" :value="money(profile.stat.revenue)" accent />
    </div>

    <AppCard pad="none" class="hm-card">
      <template #head>
        <div class="card-title"><AppIcon name="grid" :size="16" class="ico" /><span>{{ t('成交量热力图') }}</span></div>
        <AppTag variant="brand">{{ t('累计 {n} 单', { n: fmtNum(profile.stat.total) }) }}</AppTag>
      </template>
      <div class="hm-body">
        <ContributionHeatmap :data="profile.heatmap" />
      </div>
    </AppCard>

    <div class="grid grid-main-side">
      <AppCard pad="none" class="agents-card">
        <template #head>
          <div class="card-title"><AppIcon name="cpu" :size="16" class="ico" /><span>{{ t('我的 Agents') }}</span></div>
          <AppButton variant="ghost" size="sm" @click="router.push('/u/chenmo-dev')">{{ t('查看全部') }}</AppButton>
        </template>
        <div class="agents">
          <button
            v-for="a in profile.agents"
            :key="a.id"
            type="button"
            class="agent-tile"
            @click="router.push('/u/chenmo-dev')"
          >
            <span class="agent-tile__brand" :style="{ background: hexA(a.accent, 0.12) }">
              <AppIcon :name="a.icon" brand :size="19" />
            </span>
            <span class="agent-tile__info">
              <span class="agent-tile__name">
                {{ a.name }}
                <span class="agent-tile__dot" :style="{ background: a.status === 'online' ? 'var(--success)' : 'var(--warn)' }" />
              </span>
              <span class="agent-tile__price num">{{ a.price }}{{ a.unit }}</span>
            </span>
            <AppIcon name="chev-right" :size="15" class="agent-tile__arrow" />
          </button>
        </div>
      </AppCard>

      <div class="stack stack-16">
        <AppCard pad="none">
          <template #head>
            <div class="card-title"><AppIcon name="wallet" :size="16" class="ico" /><span>{{ t('钱包概览') }}</span></div>
            <AppButton variant="primary" size="sm" @click="router.push('/wallet')">{{ t('去充值') }}</AppButton>
          </template>
          <div class="wal-mini">
            <div class="wal-mini__amt num">{{ money(wallet.wallet.balance) }}</div>
            <div class="wal-mini__meta">{{ t('本月已消费') }} <span class="num">{{ money(wallet.wallet.monthCost) }}</span></div>
          </div>
        </AppCard>

        <AppCard pad="none">
          <template #head>
            <div class="card-title"><AppIcon name="trending-up" :size="16" class="ico" /><span>{{ t('最近成交') }}</span></div>
            <AppButton variant="ghost" size="sm" @click="router.push('/wallet')">{{ t('全部') }}</AppButton>
          </template>
          <div class="txs">
            <div v-for="b in profile.recentBilling(3)" :key="b.id" class="list-row tx-row">
              <span class="tx-row__ico" :class="'tx-' + b.type"><AppIcon :name="b.type === 'call' ? 'zap' : b.type === 'recharge' ? 'coins' : 'arrow-up-right'" :size="15" /></span>
              <div class="list-row__main">
                <div class="list-row__title">{{ b.type === 'call' ? t('调用 · {a}', { a: b.agent }) : b.type === 'recharge' ? t('充值 · {a}', { a: b.agent }) : t('提现 · {a}', { a: b.agent }) }}</div>
                <div class="list-row__sub">{{ timeAgo(b.time) }}</div>
              </div>
              <span class="num" :class="b.amount > 0 ? 'num-up' : 'num-down'">{{ b.amount > 0 ? '+' : '' }}{{ money(b.amount) }}</span>
            </div>
          </div>
        </AppCard>
      </div>
    </div>
  </div>
</template>

<style scoped>
.head-actions { display: flex; gap: 10px; }
.hm-card, .grid-main-side { margin-top: 16px; }
.hm-body { padding: 18px 20px 10px; }
.agents { padding: 6px 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
.agent-tile {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 10px;
  border-radius: 12px;
  text-align: left;
  transition: background var(--dur) var(--ease);
}
.agent-tile:hover { background: var(--surface-hover); }
.agent-tile__brand {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}
.agent-tile__info { flex: 1 1 auto; min-width: 0; }
.agent-tile__name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-strong);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.agent-tile__dot { width: 6px; height: 6px; border-radius: 50%; flex: 0 0 auto; }
.agent-tile__price { font-size: 11.5px; color: var(--text-weak); margin-top: 2px; display: block; }
.agent-tile__arrow { color: var(--text-faint); }
.wal-mini { padding: 18px 20px; }
.wal-mini__amt { font-size: 26px; font-weight: 700; color: var(--text-strong); }
.wal-mini__meta { margin-top: 4px; font-size: 12px; color: var(--text-weak); }
.txs { padding: 4px 20px 10px; }
.tx-row { padding: 12px 0; }
.tx-row__ico {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}
.tx-call { background: var(--brand-soft); color: var(--brand); }
.tx-recharge { background: var(--success-soft); color: var(--success); }
.tx-withdraw { background: var(--warn-soft); color: var(--warn); }

@media (max-width: 700px) {
  .agents { grid-template-columns: 1fr; }
}
</style>