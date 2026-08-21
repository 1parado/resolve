<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useProfileStore } from '@/stores/profile'
import { useUiStore } from '@/stores/ui'
import AppIcon from '@/components/icons/AppIcon.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import AppCard from '@/components/base/AppCard.vue'
import AppTag from '@/components/base/AppTag.vue'
import AppModal from '@/components/base/AppModal.vue'
import StatCard from '@/components/base/StatCard.vue'
import StatusDot from '@/components/base/StatusDot.vue'
import OsBadge from '@/components/base/OsBadge.vue'
import EmptyState from '@/components/base/EmptyState.vue'
import ContributionHeatmap from '@/components/profile/ContributionHeatmap.vue'
import { t } from '@/i18n'
import { esc, fmtNum, hexA, identicon, money, timeAgo } from '@/utils/format'

const router = useRouter()
const profile = useProfileStore()
const ui = useUiStore()

const detail = ref<{ open: boolean; id: string }>({ open: false, id: '' })

function openDetail(id: string) {
  detail.value = { open: true, id }
}
function closeDetail() {
  detail.value = { open: false, id: '' }
}

const agentActive = () => profile.agents.find((a) => a.id === detail.value.id)

async function copyLink() {
  try {
    await navigator.clipboard.writeText('https://resolve.local/u/chenmo-dev')
    ui.toast({ type: 'success', title: t('已复制分享链接') })
  } catch {
    ui.toast({ type: 'error', title: t('复制失败'), desc: t('请手动复制链接') })
  }
}

const nodeIsConnected = () => profile.node.connected
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1 class="page-title">{{ t('个人主页') }}</h1>
        <p class="page-sub">{{ t('你的公开身份与在线节点，其他用户可见、可调。成交量按天记录，最近 53 周可回溯。') }}</p>
      </div>
    </div>

    <!-- 身份卡 -->
    <AppCard pad="lg" class="hero-card">
      <div class="hero">
        <AppAvatar :name="profile.profile.name" :src="identicon(profile.profile.github || profile.profile.name, 200)" :size="84" />
        <div class="hero__info">
          <div class="hero__name-row">
            <h2 class="hero__name">{{ profile.profile.name }}</h2>
            <AppTag variant="brand" dot>{{ t('认证服务商') }}</AppTag>
          </div>
          <div class="hero__job">{{ profile.profile.job }}</div>
          <div class="hero__meta">
            <OsBadge :id="profile.profile.os.id" :label="profile.profile.os.label" />
            <a class="hero__gh" :href="'https://github.com/' + esc(profile.profile.github)" target="_blank" rel="noopener">
              <AppIcon name="github" brand :size="15" />
              <span>github.com/{{ esc(profile.profile.github) }}</span>
            </a>
            <span class="hero__joined"><AppIcon name="calendar" :size="14" />{{ t('加入于 {d}', { d: profile.profile.joined }) }}</span>
          </div>
          <p class="hero__bio">{{ profile.profile.bio }}</p>
        </div>
        <div class="hero__actions">
          <AppButton icon="edit" @click="router.push('/profile/edit')">{{ t('编辑资料') }}</AppButton>
          <AppButton variant="primary" icon="plug" @click="router.push('/connect')">{{ t('接入 Agent') }}</AppButton>
        </div>
      </div>
    </AppCard>

    <!-- 指标 -->
    <div class="grid grid-4 stats">
      <StatCard icon="zap" :label="t('今日成交量')" :value="profile.stat.today + t('单')" :hint="t('实时')" accent />
      <StatCard icon="trending-up" :label="t('本周成交量')" :value="profile.stat.week + t('单')" />
      <StatCard icon="check-circle" :label="t('累计成交量')" :value="fmtNum(profile.stat.total) + t('单')" />
      <StatCard icon="coins" :label="t('本月收入')" :value="money(profile.stat.revenue)" accent />
    </div>

    <!-- 热力图 -->
    <AppCard pad="none" class="hm-card">
      <template #head>
        <div class="card-title"><AppIcon name="grid" :size="16" class="ico" /><span>{{ t('成交量热力图') }}</span></div>
        <AppTag variant="brand">{{ t('累计 {n} 单', { n: fmtNum(profile.stat.total) }) }}</AppTag>
      </template>
      <div class="hm-body">
        <ContributionHeatmap :data="profile.heatmap" />
      </div>
    </AppCard>

    <!-- 两栏 -->
    <div class="grid grid-main-side main-grid">
      <AppCard pad="none">
        <template #head>
          <div class="card-title"><AppIcon name="cpu" :size="16" class="ico" /><span>{{ t('我的 Agents') }}</span></div>
          <span class="card-sub">{{ t('点击查看详情') }}</span>
        </template>
        <div class="agents">
          <button v-for="a in profile.agents" :key="a.id" type="button" class="tile" @click="openDetail(a.id)">
            <span class="tile__brand" :style="{ background: hexA(a.accent, 0.12) }">
              <AppIcon :name="a.icon" brand :size="20" />
            </span>
            <span class="tile__main">
              <span class="tile__name">{{ a.name }} <i class="tile__status" :style="{ background: a.status === 'online' ? 'var(--success)' : 'var(--warn)' }" /></span>
              <span class="tile__models">
                <AppTag v-for="m in a.models.slice(0, 1)" :key="m" variant="default">{{ m }}</AppTag>
              </span>
            </span>
            <span class="tile__price num">{{ a.price }}<em>{{ a.unit }}</em></span>
            <AppIcon name="chev-right" :size="15" class="tile__arrow" />
          </button>
        </div>
      </AppCard>

      <div class="stack stack-16">
        <AppCard pad="none">
          <template #head>
            <div class="card-title"><AppIcon name="server" :size="16" class="ico" /><span>{{ t('在线节点') }}</span></div>
          </template>
          <div v-if="nodeIsConnected()" class="node">
            <div class="node__head">
              <span class="node__name">{{ profile.node.name }}</span>
              <StatusDot status="online" :label="t('在线')" />
            </div>
            <div class="node__ip mono">{{ profile.node.ip }}:{{ profile.node.port }}</div>
            <div class="node__tags">
              <AppTag icon="layers">{{ profile.node.runtime }}</AppTag>
              <AppTag :variant="profile.node.visibility === 'public' ? 'brand' : 'warn'" :icon="profile.node.visibility === 'public' ? 'globe' : 'lock'">
                {{ profile.node.visibility === 'public' ? t('全网公开') : t('仅企业内网') }}
              </AppTag>
            </div>
            <div class="node__agents">
              <AppTag v-for="ag in profile.node.agents" :key="ag">{{ ag }}</AppTag>
            </div>
          </div>
          <EmptyState
            v-else
            icon="plug"
            :title="t('尚未接入节点')"
            :desc="t('扫描本地或云端 Agent，可视化配置 IP、端口与模型后一键发布到个人主页。')"
            :action-text="t('立即接入')"
            @action="router.push('/connect')"
          />
        </AppCard>

        <AppCard pad="none">
          <template #head>
            <div class="card-title"><AppIcon name="trending-up" :size="16" class="ico" /><span>{{ t('最近成交') }}</span></div>
            <a class="card-link" @click="router.push('/wallet')">{{ t('全部流水') }}</a>
          </template>
          <div class="txs">
            <div v-for="b in profile.recentBilling(5)" :key="b.id" class="list-row tx-row">
              <span class="tx-row__ico" :class="'tx-' + b.type">
                <AppIcon :name="b.type === 'call' ? 'zap' : b.type === 'recharge' ? 'coins' : 'arrow-up-right'" :size="15" />
              </span>
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

    <!-- Agent 详情 -->
    <AppModal :model-value="detail.open" :title="agentActive()?.name || ''" :subtitle="agentActive()?.product" :width="480" @update:model-value="closeDetail">
      <div v-if="agentActive()" class="detail">
        <div class="detail__brand" :style="{ background: hexA(agentActive()!.accent, 0.12) }">
          <AppIcon :name="agentActive()!.icon" brand :size="30" />
        </div>
        <div class="detail__info">
          <p class="detail__desc">{{ agentActive()!.desc }}</p>
          <div class="detail__tags">
            <AppTag v-for="t in agentActive()!.tags" :key="t">{{ t }}</AppTag>
          </div>
          <div class="detail__models">
            <div class="detail__label">{{ t('可用模型') }}</div>
            <div class="detail__chips">
              <AppTag v-for="m in agentActive()!.models" :key="m" variant="weak" class="mono-chip">{{ m }}</AppTag>
            </div>
          </div>
          <div class="detail__price num">{{ agentActive()!.price }}<span>{{ agentActive()!.unit }}</span></div>
        </div>
      </div>
      <template #footer>
        <AppButton icon="copy" @click="copyLink">{{ t('复制分享链接') }}</AppButton>
        <AppButton variant="ghost" @click="closeDetail">{{ t('关闭') }}</AppButton>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.hero-card { margin-bottom: 16px; }
.hero { display: flex; align-items: flex-start; gap: 20px; }
.hero__info { flex: 1 1 auto; min-width: 0; }
.hero__name-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.hero__name { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
.hero__job { margin-top: 6px; font-size: 14px; color: var(--text-mid); }
.hero__meta { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 12px; }
.hero__gh {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: var(--text-mid);
}
.hero__gh:hover { color: var(--brand); }
.hero__joined {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: var(--text-weak);
}
.hero__bio { margin-top: 12px; font-size: 13px; color: var(--text-weak); line-height: 1.65; }
.hero__actions { display: flex; flex-direction: column; gap: 10px; flex: 0 0 auto; }

.stats { margin-bottom: 16px; }
.hm-card { margin-bottom: 16px; }
.hm-body { padding: 18px 20px 10px; }
.card-sub { font-size: 12px; color: var(--text-faint); }

.agents { padding: 6px 8px; display: flex; flex-direction: column; gap: 2px; }
.tile {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 10px;
  border-radius: 12px;
  text-align: left;
  transition: background var(--dur) var(--ease);
}
.tile:hover { background: var(--surface-hover); }
.tile__brand {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}
.tile__main { flex: 1 1 auto; min-width: 0; }
.tile__name {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-strong);
}
.tile__status { width: 6px; height: 6px; border-radius: 50%; }
.tile__models { display: flex; margin-top: 4px; }
.tile__price { font-size: 13px; font-weight: 600; color: var(--text-strong); white-space: nowrap; }
.tile__price em { font-style: normal; font-size: 11px; color: var(--text-faint); margin-left: 2px; }
.tile__arrow { color: var(--text-faint); }

.node { padding: 18px 20px; }
.node__head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.node__name { font-size: 14.5px; font-weight: 600; color: var(--text-strong); }
.node__ip {
  margin-top: 8px;
  padding: 8px 12px;
  background: var(--surface-code);
  color: #7dd3fc;
  border-radius: 8px;
  font-size: 13px;
  letter-spacing: 0.02em;
}
.node__tags { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
.node__agents { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }

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
.card-link { font-size: 12.5px; color: var(--brand); cursor: pointer; }
.card-link:hover { text-decoration: underline; }

.detail__brand {
  width: 54px;
  height: 54px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
}
.detail__desc { font-size: 13.5px; color: var(--text-mid); line-height: 1.7; }
.detail__tags { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
.detail__models { margin-top: 16px; }
.detail__label { font-size: 12px; color: var(--text-faint); margin-bottom: 8px; }
.detail__chips { display: flex; gap: 8px; flex-wrap: wrap; }
.detail__price { margin-top: 16px; font-size: 18px; font-weight: 700; color: var(--text-strong); }
.detail__price span { font-size: 12px; color: var(--text-weak); margin-left: 4px; }

@media (max-width: 700px) {
  .hero { flex-direction: column; align-items: flex-start; }
  .hero__actions { flex-direction: row; width: 100%; }
  .hero__actions :deep(.btn) { flex: 1; }
}
</style>