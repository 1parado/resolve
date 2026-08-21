<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useEnterpriseStore } from '@/stores/enterprise'
import { useUiStore } from '@/stores/ui'
import AppIcon from '@/components/icons/AppIcon.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppCard from '@/components/base/AppCard.vue'
import AppTag from '@/components/base/AppTag.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import AppSwitch from '@/components/base/AppSwitch.vue'
import StatusDot from '@/components/base/StatusDot.vue'
import { computed } from 'vue'
import { t } from '@/i18n'
import { fmtNum, identicon, money, timeAgo } from '@/utils/format'

const router = useRouter()
const ent = useEnterpriseStore()
const ui = useUiStore()

const SETTING_META = computed(() => [
  { key: 'allowMutualCall', label: t('允许成员互相调用'), desc: t('成员可以在企业内调用彼此的 Agent') },
  { key: 'allowGuestView', label: t('允许访客查看'), desc: t('未登录访客可浏览成员公开主页') },
  { key: 'enforceLocalOnly', label: t('强制内网执行'), desc: t('企业 Agent 仅能在内网节点运行') },
  { key: 'autoApprove', label: t('调用审批制'), desc: t('新成员的调用需管理员审批') },
])

function toggle(key: string, v: boolean) {
  ent.setSetting(key, v)
  ui.toast({ type: 'success', title: t('已更新'), desc: t('设置已保存并同步到全部成员') })
}
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1 class="page-title">{{ t('企业版') }}</h1>
        <p class="page-sub">{{ t('企业内网互相查看与调用 Agent，数据不出局域网') }}</p>
      </div>
      <div class="head-actions">
        <AppButton variant="primary" icon="settings" @click="router.push('/enterprise/admin')">{{ t('企业管理') }}</AppButton>
      </div>
    </div>

    <AppCard pad="lg" class="ent-card">
      <div class="ent">
        <span class="ent__logo">远</span>
        <div class="ent__main">
          <div class="ent__name">{{ ent.ent.name }}</div>
          <div class="ent__meta">
            <span>{{ t('{n} 席成员', { n: ent.ent.seats }) }}</span>
            <span class="ent__dot" />
            <span>{{ t('内网优先') }}</span>
            <span class="ent__dot" />
            <span>{{ t('按量计费') }}</span>
          </div>
        </div>
        <AppTag variant="brand">{{ t('企业版') }}</AppTag>
      </div>
    </AppCard>

    <div class="grid grid-4 stats">
      <div class="e-stat"><span>{{ t('本月调用') }}</span><b class="num">{{ fmtNum(ent.ent.usage.monthCalls) }}</b><em>{{ t('次') }}</em></div>
      <div class="e-stat"><span>{{ t('本月 Token') }}</span><b class="num">{{ ent.ent.usage.monthTokens }}</b><em></em></div>
      <div class="e-stat"><span>{{ t('本月费用') }}</span><b class="num">{{ money(ent.ent.usage.monthFee) }}</b><em></em></div>
      <div class="e-stat"><span>{{ t('成员总数') }}</span><b class="num">{{ ent.ent.members.length }}</b><em>{{ t('人') }}</em></div>
    </div>

    <div class="grid grid-main-side main-grid">
      <AppCard pad="none">
        <template #head>
          <div class="card-title"><AppIcon name="users" :size="16" class="ico" /><span>{{ t('成员') }}</span></div>
          <AppButton variant="ghost" size="sm" icon="users" @click="ui.toast({ type: 'info', title: t('邀请链接已复制'), desc: t('演示环境不会真实发送邀请') })">{{ t('邀请成员') }}</AppButton>
        </template>
        <div class="members">
          <button
            v-for="m in ent.ent.members"
            :key="m.id"
            type="button"
            class="mem"
            @click="router.push('/enterprise/m/' + m.id)"
          >
            <AppAvatar :name="m.name" :src="identicon(m.id, 96)" :size="36" :status="m.online ? 'online' : 'offline'" />
            <span class="mem__main">
              <span class="mem__name">
                {{ m.name }}
                <AppTag v-if="m.role === '管理员'" variant="brand" class="mem__role">{{ t('管理员') }}</AppTag>
              </span>
              <span class="mem__meta">{{ m.job }} · {{ m.os.label }}</span>
            </span>
            <span class="mem__agents">
              <AppTag v-for="a in m.agents.slice(0, 2)" :key="a" variant="weak" class="mem__tag">{{ a }}</AppTag>
              <AppTag v-if="m.agents.length > 2" variant="weak" class="mem__tag">+{{ m.agents.length - 2 }}</AppTag>
            </span>
            <span class="mem__status"><StatusDot :status="m.online ? 'online' : 'offline'" /></span>
            <AppIcon name="chev-right" :size="15" class="mem__arrow" />
          </button>
        </div>
      </AppCard>

      <div class="stack stack-16">
        <AppCard pad="none">
          <template #head>
            <div class="card-title"><AppIcon name="shield" :size="16" class="ico" /><span>{{ t('企业设置') }}</span></div>
          </template>
          <div class="setts">
            <div v-for="s in SETTING_META" :key="s.key" class="sett">
              <div class="sett__main">
                <div class="sett__label">{{ s.label }}</div>
                <div class="sett__desc">{{ s.desc }}</div>
              </div>
              <AppSwitch :model-value="!!ent.ent.settings[s.key]" @update:model-value="(v: boolean) => toggle(s.key, v)" />
            </div>
          </div>
        </AppCard>

        <AppCard pad="none">
          <template #head>
            <div class="card-title"><AppIcon name="clock" :size="16" class="ico" /><span>{{ t('团队动态') }}</span></div>
          </template>
          <div class="logs">
            <div v-for="(l, i) in ent.ent.logs.slice(0, 6)" :key="i" class="log">
              <span class="log__dot" :class="'lg-' + l.type" />
              <div class="log__main">
                <div class="log__text">{{ l.who }} {{ l.action }}</div>
                <div class="log__sub">{{ timeAgo(l.time) }} · {{ l.result }}</div>
              </div>
            </div>
          </div>
        </AppCard>
      </div>
    </div>
  </div>
</template>

<style scoped>
.head-actions { display: flex; gap: 10px; }
.ent { display: flex; align-items: center; gap: 14px; }
.ent__logo {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: var(--brand-grad);
  color: #fff;
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--sh-brand);
  flex: 0 0 auto;
}
.ent__main { flex: 1 1 auto; min-width: 0; }
.ent__name { font-size: 18px; font-weight: 700; color: var(--text-strong); }
.ent__meta { display: flex; align-items: center; gap: 8px; margin-top: 6px; font-size: 12.5px; color: var(--text-weak); }
.ent__dot { width: 3px; height: 3px; border-radius: 50%; background: var(--border-strong); }

.stats { margin-top: 16px; }
.e-stat {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  box-shadow: var(--sh-1);
  padding: 16px 18px;
}
.e-stat span { font-size: 12px; color: var(--text-weak); display: block; }
.e-stat b { font-size: 22px; font-weight: 700; color: var(--text-strong); }
.e-stat em { font-style: normal; font-size: 12px; color: var(--text-faint); margin-left: 3px; }

.members { padding: 4px 8px; display: flex; flex-direction: column; }
.mem {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 10px;
  border-radius: 12px;
  text-align: left;
  transition: background var(--dur) var(--ease);
}
.mem:hover { background: var(--surface-hover); }
.mem__main { flex: 1 1 auto; min-width: 0; }
.mem__name { display: flex; align-items: center; gap: 7px; font-size: 13.5px; font-weight: 600; color: var(--text-strong); }
.mem__role { font-size: 10.5px; padding: 1px 7px; }
.mem__meta { margin-top: 3px; font-size: 12px; color: var(--text-faint); display: block; }
.mem__agents { display: flex; gap: 6px; flex: 0 0 auto; }
.mem__tag { font-size: 11px; padding: 2px 8px; }
.mem__status { flex: 0 0 auto; }
.mem__arrow { color: var(--text-faint); }

.setts { padding: 6px 20px 12px; }
.sett {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 13px 0;
  border-bottom: 1px solid var(--border);
}
.sett:last-child { border-bottom: none; }
.sett__label { font-size: 13.5px; font-weight: 500; color: var(--text-strong); }
.sett__desc { margin-top: 3px; font-size: 12px; color: var(--text-faint); }

.logs { padding: 4px 20px 12px; }
.log { display: flex; gap: 10px; padding: 10px 0; }
.log__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-faint);
  margin-top: 6px;
  flex: 0 0 auto;
}
.lg-call { background: var(--brand); }
.lg-perm { background: var(--warn); }
.lg-node { background: var(--success); }
.lg-audit { background: var(--text-faint); }
.log__text { font-size: 13px; color: var(--text-mid); }
.log__sub { margin-top: 3px; font-size: 11.5px; color: var(--text-faint); }
</style>