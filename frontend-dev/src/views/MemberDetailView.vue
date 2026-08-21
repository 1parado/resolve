<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEnterpriseStore } from '@/stores/enterprise'
import { useUiStore } from '@/stores/ui'
import AppIcon from '@/components/icons/AppIcon.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppCard from '@/components/base/AppCard.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import AppTag from '@/components/base/AppTag.vue'
import StatusDot from '@/components/base/StatusDot.vue'
import EmptyState from '@/components/base/EmptyState.vue'
import { t } from '@/i18n'
import { identicon, money, timeAgo, mulberry32 } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const ent = useEnterpriseStore()
const ui = useUiStore()

const member = computed(() => ent.ent.members.find((m) => m.id === route.params.id))

const memberStat = computed(() => {
  if (!member.value) return null
  const rnd = mulberry32(member.value.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0))
  const calls = Math.round(20 + rnd() * 140)
  const fee = Math.round((calls * (1.2 + rnd() * 2.6)) * 100) / 100
  const rate = Math.round(94 + rnd() * 5.9)
  return { calls, fee, rate }
})

const records = computed(() => {
  if (!member.value) return []
  const now = Date.now()
  return [
    { id: 'r1', agent: member.value.agents[0] || 'Codex', time: now - 2 * 3600000, amount: -(3 + Math.round(Math.random() * 5)) },
    { id: 'r2', agent: member.value.agents[0] || 'Hermes', time: now - 20 * 3600000, amount: -(2 + Math.round(Math.random() * 4)) },
    { id: 'r3', agent: member.value.agents[1] || 'Claude Code', time: now - 40 * 3600000, amount: -(4 + Math.round(Math.random() * 6)) },
  ]
})

async function toggleRole() {
  if (!member.value) return
  const next = member.value.role === '管理员' ? '成员' : '管理员'
  await ent.setMemberRole(member.value.id, next)
  ui.toast({ type: 'success', title: t('已更新'), desc: t('{n} 当前为 {r}', { n: member.value.name, r: next }) })
}

async function kick() {
  if (!member.value) return
  const name = member.value.name
  await ent.removeMember(member.value.id)
  ui.toast({ type: 'info', title: t('已移除成员'), desc: t('{n} 已移出 {c}', { n: name, c: ent.ent.name }) })
  router.push('/enterprise')
}
</script>

<template>
  <div class="page page-narrow">
    <EmptyState
      v-if="!member"
      icon="help-circle"
      :title="t('未找到该成员')"
      :desc="t('成员可能已被移除。')"
      :action-text="t('返回企业版')"
      @action="router.push('/enterprise')"
    />

    <template v-else>
      <div class="page-head">
        <div>
          <button class="back" @click="router.push('/enterprise')">
            <AppIcon name="chev-left" :size="15" />
            <span>{{ t('返回企业版') }}</span>
          </button>
          <h1 class="page-title">{{ t('成员详情') }}</h1>
        </div>
      </div>

      <AppCard pad="lg">
        <div class="hero">
          <AppAvatar :name="member.name" :src="identicon(member.id, 160)" :size="64" :status="member.online ? 'online' : 'offline'" />
          <div class="hero__info">
            <div class="hero__name-row">
              <h2 class="hero__name">{{ member.name }}</h2>
              <AppTag v-if="member.role === '管理员'" variant="brand">{{ t('管理员') }}</AppTag>
              <AppTag :variant="member.online ? 'success' : 'default'">{{ member.online ? t('在线') : t('离线') }}</AppTag>
            </div>
            <div class="hero__meta">{{ member.job }} · {{ member.os.label }}</div>
          </div>
          <div class="hero__actions">
            <AppButton variant="ghost" size="sm" :icon="member.role === '管理员' ? 'chev-down' : 'chev-up'" @click="toggleRole">
              {{ member.role === '管理员' ? t('设为成员') : t('设为管理员') }}
            </AppButton>
            <AppButton v-if="member.role !== '管理员'" variant="danger" size="sm" icon="trash" @click="kick">{{ t('移除成员') }}</AppButton>
          </div>
        </div>
      </AppCard>

      <div class="grid grid-3 stats">
        <div class="e-stat"><span>{{ t('本月调用') }}</span><b class="num">{{ memberStat?.calls }}</b><em>{{ t('次') }}</em></div>
        <div class="e-stat"><span>{{ t('本月费用') }}</span><b class="num">{{ money(memberStat?.fee || 0) }}</b><em></em></div>
        <div class="e-stat"><span>{{ t('调用成功率') }}</span><b class="num">{{ memberStat?.rate }}</b><em>%</em></div>
      </div>

      <div class="grid grid-main-side main-grid">
        <AppCard>
          <template #head>
            <div class="card-title"><AppIcon name="cpu" :size="16" class="ico" /><span>{{ t('主机服务') }}</span></div>
          </template>
          <div class="svc">
            <div class="svc__row"><span>{{ t('运行系统') }}</span><b>{{ member.os.label }}</b></div>
            <div class="svc__row"><span>{{ t('在线状态') }}</span><StatusDot :status="member.online ? 'online' : 'offline'" /></div>
            <div class="svc__row"><span>{{ t('托管 Agent') }}</span><b class="svc__agents"><AppTag v-for="a in member.agents" :key="a">{{ a }}</AppTag></b></div>
            <div class="svc__row"><span>{{ t('可用模型') }}</span><b class="svc__agents"><AppTag v-for="m in member.models" :key="m" variant="weak" class="mono-chip">{{ m }}</AppTag></b></div>
          </div>
        </AppCard>

        <AppCard>
          <template #head>
            <div class="card-title"><AppIcon name="trending-up" :size="16" class="ico" /><span>{{ t('近期调用') }}</span></div>
            <AppButton variant="ghost" size="sm" icon="zap" @click="ui.toast({ type: 'info', title: t('调用演示'), desc: t('已向 {n} 发送一条演示调用', { n: member.name }) })">{{ t('调用') }}</AppButton>
          </template>
          <div class="txs">
            <div v-for="r in records" :key="r.id" class="list-row tx-row">
              <span class="tx-row__ico tx-call"><AppIcon name="zap" :size="15" /></span>
              <div class="list-row__main">
                <div class="list-row__title">{{ t('调用 · {a}', { a: r.agent }) }}</div>
                <div class="list-row__sub">{{ timeAgo(r.time) }} · {{ t('余额') }}</div>
              </div>
              <span class="num num-down">{{ money(r.amount) }}</span>
            </div>
          </div>
        </AppCard>
      </div>
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
.hero { display: flex; align-items: flex-start; gap: 16px; }
.hero__info { flex: 1 1 auto; min-width: 0; }
.hero__name-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.hero__name { font-size: 19px; font-weight: 700; color: var(--text-strong); }
.hero__meta { margin-top: 6px; font-size: 13px; color: var(--text-mid); }
.hero__actions { display: flex; gap: 8px; flex: 0 0 auto; flex-wrap: wrap; justify-content: flex-end; }

.stats { margin-top: 16px; }
.e-stat { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); box-shadow: var(--sh-1); padding: 16px 18px; }
.e-stat span { font-size: 12px; color: var(--text-weak); display: block; }
.e-stat b { font-size: 22px; font-weight: 700; color: var(--text-strong); }
.e-stat em { font-style: normal; font-size: 12px; color: var(--text-faint); margin-left: 3px; }

.svc { display: flex; flex-direction: column; }
.svc__row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 11px 0;
  border-bottom: 1px dashed var(--border);
  font-size: 13px;
  color: var(--text-mid);
}
.svc__row:last-child { border-bottom: none; }
.svc__row b { color: var(--text-strong); text-align: right; }
.svc__agents { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
.mono-chip { font-family: var(--font-mono); font-size: 12px; }

.txs { display: flex; flex-direction: column; }
.tx-row { padding: 11px 0; }
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

@media (max-width: 700px) {
  .hero { flex-direction: column; }
}
</style>