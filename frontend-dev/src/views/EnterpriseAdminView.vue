<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useEnterpriseStore } from '@/stores/enterprise'
import { useUiStore } from '@/stores/ui'
import AppIcon from '@/components/icons/AppIcon.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppCard from '@/components/base/AppCard.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppField from '@/components/base/AppField.vue'
import AppSwitch from '@/components/base/AppSwitch.vue'
import AppTag from '@/components/base/AppTag.vue'
import ProgressBar from '@/components/base/ProgressBar.vue'
import StatusDot from '@/components/base/StatusDot.vue'
import { t } from '@/i18n'
import { identicon, money } from '@/utils/format'
import type { MemberRole } from '@/types'

const router = useRouter()
const ent = useEnterpriseStore()
const ui = useUiStore()

const name = ref(ent.ent.name)
const seats = ref(String(ent.ent.seats))
const budget = ref('3000')
const saving = ref(false)

const BUDGET = 3000
const budgetPct = Math.min(100, Math.round((ent.ent.usage.monthFee / BUDGET) * 100))

async function saveBasic() {
  saving.value = true
  try {
    await ent.updateBasic({ name: name.value.trim() || ent.ent.name, seats: Math.max(1, Number(seats.value) || 1) })
    ui.toast({ type: 'success', title: t('已保存'), desc: t('企业信息已更新') })
  } finally {
    saving.value = false
  }
}

function saveBudget() {
  const b = Number(budget.value)
  if (b > 0) {
    ui.toast({ type: 'success', title: t('已保存'), desc: t('月度预算上限设置为 {n}', { n: money(b) }) })
  }
}

async function setRole(m: { id: string; role: MemberRole }, role: MemberRole) {
  await ent.setMemberRole(m.id, role)
  ui.toast({ type: 'success', title: t('已更新'), desc: t('已将 {a} 调整为 {b}', { a: m.role, b: role }) })
}

async function kick(m: { id: string; name: string }) {
  await ent.removeMember(m.id)
  ui.toast({ type: 'info', title: t('已移除成员'), desc: t('{n} 不再属于 {c}', { n: m.name, c: ent.ent.name }) })
}
</script>

<template>
  <div class="page page-narrow">
    <div class="page-head">
      <div>
        <button class="back" @click="router.push('/enterprise')">
          <AppIcon name="chev-left" :size="15" />
          <span>{{ t('返回企业版') }}</span>
        </button>
        <h1 class="page-title">{{ t('企业管理') }}</h1>
        <p class="page-sub">{{ t('维护企业信息、成员权限与消费预算') }}</p>
      </div>
    </div>

    <div class="grid grid-2 main-grid">
      <AppCard pad="lg">
        <template #head>
          <div class="card-title"><AppIcon name="building" :size="16" class="ico" /><span>{{ t('基本信息') }}</span></div>
        </template>
        <div class="form-grid form-grid-1 form-stack">
          <AppField :label="t('企业名称')">
            <AppInput v-model="name" :placeholder="t('企业名称')" />
          </AppField>
          <AppField :label="t('席位数量')" :hint="t('成员达到上限后需扩容')">
            <AppInput v-model="seats" type="number" min="1" />
          </AppField>
        </div>
        <div class="foot">
          <AppButton variant="primary" :loading="saving" @click="saveBasic">{{ t('保存') }}</AppButton>
        </div>
      </AppCard>

      <AppCard pad="lg">
        <template #head>
          <div class="card-title"><AppIcon name="coins" :size="16" class="ico" /><span>{{ t('消费预算') }}</span></div>
        </template>
        <div class="budget">
          <div class="budget__row"><span>{{ t('本月已用') }}</span><b class="num">{{ money(ent.ent.usage.monthFee) }}</b></div>
          <div class="budget__row"><span>{{ t('预算上限') }}</span><b class="num">{{ money(BUDGET) }}</b></div>
          <ProgressBar :value="budgetPct" :height="8" class="budget__bar" />
          <div class="budget__hint">{{ t('已使用 {p}%，到达 80% 将提醒管理员', { p: budgetPct }) }}</div>
          <AppField :label="t('调整上限')">
            <AppInput v-model="budget" type="number" min="100" />
          </AppField>
          <AppButton variant="primary" icon="check" @click="saveBudget">{{ t('保存上限') }}</AppButton>
        </div>
      </AppCard>
    </div>

    <AppCard pad="none" class="mem-card">
      <template #head>
        <div class="card-title"><AppIcon name="users" :size="16" class="ico" /><span>{{ t('成员管理') }}</span></div>
        <span class="card-sub">{{ t('{n} 人 · 管理员可调整角色与移除成员', { n: ent.ent.members.length }) }}</span>
      </template>
      <div class="members">
        <div v-for="m in ent.ent.members" :key="m.id" class="mem">
          <AppAvatar :name="m.name" :src="identicon(m.id, 96)" :size="38" :status="m.online ? 'online' : 'offline'" />
          <div class="mem__main">
            <div class="mem__name">
              {{ m.name }}
              <AppTag v-if="m.role === '管理员'" variant="brand" class="mem__role">{{ t('管理员') }}</AppTag>
            </div>
            <div class="mem__meta">{{ m.job }} · {{ m.os.label }}</div>
          </div>
          <StatusDot :status="m.online ? 'online' : 'offline'" class="mem__status" />
          <div class="mem__ops">
            <button
              type="button"
              class="op"
              :class="{ ghost: m.role === '管理员' }"
              @click="setRole(m, m.role === '管理员' ? '成员' : '管理员')"
            >
              {{ m.role === '管理员' ? t('设为成员') : t('设为管理员') }}
            </button>
            <button v-if="m.role !== '管理员'" type="button" class="op danger" @click="kick(m)">{{ t('移除') }}</button>
          </div>
        </div>
      </div>
    </AppCard>
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
.main-grid { margin-top: 16px; align-items: start; }
.form-stack { display: flex; flex-direction: column; gap: 16px; }
.foot { display: flex; justify-content: flex-end; margin-top: 18px; }

.budget { display: flex; flex-direction: column; gap: 12px; }
.budget__row { display: flex; align-items: center; justify-content: space-between; font-size: 13px; color: var(--text-mid); }
.budget__row b { color: var(--text-strong); }
.budget__hint { font-size: 12px; color: var(--text-faint); margin-bottom: 6px; }

.mem-card { margin-top: 16px; }
.card-sub { font-size: 12px; color: var(--text-faint); }
.members { padding: 4px 20px 12px; }
.mem {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}
.mem:last-child { border-bottom: none; }
.mem__main { flex: 1 1 auto; min-width: 0; }
.mem__name { display: flex; align-items: center; gap: 7px; font-size: 13.5px; font-weight: 600; color: var(--text-strong); }
.mem__role { font-size: 10.5px; padding: 1px 7px; }
.mem__meta { margin-top: 3px; font-size: 12px; color: var(--text-faint); }
.mem__ops { display: flex; gap: 8px; flex: 0 0 auto; }
.op {
  font-size: 12px;
  font-weight: 600;
  color: var(--brand);
  background: var(--brand-soft);
  padding: 6px 12px;
  border-radius: 8px;
  transition: all var(--dur) var(--ease);
}
.op:hover { background: var(--brand-line); }
.op.ghost { color: var(--text-faint); background: var(--surface-soft); }
.op.ghost:hover { color: var(--text-strong); background: var(--surface-hover); }
.op.danger { color: var(--danger); background: var(--danger-soft); }
.op.danger:hover { background: var(--danger-line); }
</style>