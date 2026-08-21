<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useTasksStore } from '@/stores/tasks'
import { useProfileStore } from '@/stores/profile'
import { useUiStore } from '@/stores/ui'
import AppIcon from '@/components/icons/AppIcon.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppCard from '@/components/base/AppCard.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppField from '@/components/base/AppField.vue'
import AppModal from '@/components/base/AppModal.vue'
import AppSegmented from '@/components/base/AppSegmented.vue'
import ProgressBar from '@/components/base/ProgressBar.vue'
import EmptyState from '@/components/base/EmptyState.vue'
import { t } from '@/i18n'
import { fmtNum, hexA, timeAgo } from '@/utils/format'
import type { TaskStatus } from '@/types'

const router = useRouter()
const tasks = useTasksStore()
const profile = useProfileStore()
const ui = useUiStore()

const createOpen = ref(false)
const title = ref('')
const agentId = ref(profile.agents[0]?.id || '')
const runType = ref<'once' | 'schedule'>('once')
const submitting = ref(false)

const STATUS: Record<TaskStatus, { label: string; cls: string; icon: string }> = {
  running: { label: '执行中', cls: 'is-running', icon: 'refresh' },
  done: { label: '已完成', cls: 'is-done', icon: 'check-circle' },
  failed: { label: '失败', cls: 'is-failed', icon: 'alert' },
  cancelled: { label: '已终止', cls: 'is-cancelled', icon: 'x' },
  pending: { label: '排队中', cls: 'is-pending', icon: 'clock' },
}

const statusLabel = (s: TaskStatus) => t(STATUS[s].label)

async function submit() {
  const a = profile.agents.find((x) => x.id === agentId.value)
  if (!a) return
  submitting.value = true
  try {
    await tasks.create({
      title: title.value.trim(),
      agent: a.name,
      agentIcon: a.icon,
      agentAccent: a.accent,
      type: runType.value,
      schedule: runType.value === 'schedule' ? '每天 09:00' : undefined,
    })
    ui.toast({ type: 'success', title: t('任务已创建'), desc: t('将在后台开始执行') })
    createOpen.value = false
  } finally {
    submitting.value = false
  }
}

async function cancelTask(id: string) {
  await tasks.cancel(id)
  ui.toast({ type: 'info', title: t('已终止任务') })
}

async function rerunTask(id: string) {
  await tasks.rerun(id)
  ui.toast({ type: 'info', title: t('任务重新执行中') })
}
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1 class="page-title">{{ t('任务中心') }}</h1>
        <p class="page-sub">{{ t('把重复性工作交给 Agent，支持一次性与定时调度') }}</p>
      </div>
      <div class="head-actions">
        <AppButton variant="primary" icon="plus" @click="createOpen = true">{{ t('新建任务') }}</AppButton>
      </div>
    </div>

    <AppCard v-if="tasks.items.length" pad="none">
      <template #head>
        <div class="card-title"><AppIcon name="clipboard" :size="16" class="ico" /><span>{{ t('全部任务') }}</span></div>
        <span class="card-sub">{{ t('{n} 个任务', { n: tasks.items.length }) }}</span>
      </template>
      <div class="tasks">
        <button
          v-for="tk in tasks.items"
          :key="tk.id"
          type="button"
          class="task"
          @click="router.push('/tasks/' + tk.id)"
        >
          <span class="task__brand" :style="{ background: hexA(tk.agentAccent, 0.12) }">
            <AppIcon :name="tk.agentIcon" :size="18" />
          </span>
          <span class="task__main">
            <span class="task__title-row">
              <span class="task__title">{{ tk.title }}</span>
              <span class="task__status" :class="STATUS[tk.status].cls">
                <AppIcon :name="STATUS[tk.status].icon" :size="12" />
                {{ statusLabel(tk.status) }}
              </span>
            </span>
            <span class="task__meta">
              {{ tk.agent }} · {{ tk.type === 'schedule' ? (tk.schedule || t('定时')) : t('一次性') }} · {{ timeAgo(tk.created) }}
            </span>
            <span v-if="tk.status === 'running' || tk.status === 'failed'" class="task__bar">
              <ProgressBar :value="tk.progress" :height="5" :color="tk.status === 'failed' ? 'var(--danger)' : undefined" />
            </span>
            <span class="task__stats">
              <span class="num">{{ fmtNum(tk.tokens) }}</span> token · <span class="num">¥{{ tk.cost.toFixed(2) }}</span>
            </span>
          </span>
          <span class="task__actions" @click.stop>
            <button v-if="tk.status === 'running' || tk.status === 'pending'" class="task__act" :title="t('终止')" @click="cancelTask(tk.id)">
              <AppIcon name="x" :size="15" />
            </button>
            <button v-if="tk.status === 'failed' || tk.status === 'cancelled'" class="task__act" :title="t('重跑')" @click="rerunTask(tk.id)">
              <AppIcon name="refresh" :size="15" />
            </button>
            <AppIcon name="chev-right" :size="15" class="task__arrow" />
          </span>
        </button>
      </div>
    </AppCard>

    <EmptyState
      v-else
      icon="clipboard"
      :title="t('还没有任务')"
      :desc="t('新建一个任务，让 Agent 为你处理重复工作。')"
      :action-text="t('新建任务')"
      @action="createOpen = true"
    />

    <!-- 新建任务 -->
    <AppModal v-model="createOpen" :title="t('新建任务')" :subtitle="t('选择一个 Agent 并描述任务')" :width="460">
      <div class="form-grid form-grid-1">
        <AppField :label="t('任务名称')" required>
          <AppInput v-model="title" :placeholder="t('例如：整理本周竞品动态')" />
        </AppField>
        <AppField :label="t('执行 Agent')" required>
          <select class="select" :value="agentId" @change="agentId = ($event.target as HTMLSelectElement).value">
            <option v-for="a in profile.agents" :key="a.id" :value="a.id">{{ a.name }} · {{ a.product }}</option>
          </select>
        </AppField>
        <AppField :label="t('调度方式')">
          <AppSegmented
            :model-value="runType"
            :options="[
              { value: 'once', label: t('一次性'), icon: 'play' },
              { value: 'schedule', label: t('定时执行'), icon: 'clock' },
            ]"
            @update:model-value="(v: string) => (runType = v as 'once' | 'schedule')"
          />
        </AppField>
      </div>
      <template #footer>
        <AppButton variant="ghost" @click="createOpen = false">{{ t('取消') }}</AppButton>
        <AppButton variant="primary" icon="plus" :loading="submitting" @click="submit">{{ t('创建任务') }}</AppButton>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.head-actions { display: flex; gap: 10px; }
.card-sub { font-size: 12px; color: var(--text-faint); }
.tasks { padding: 4px 8px; display: flex; flex-direction: column; }
.task {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 10px;
  border-radius: 12px;
  text-align: left;
  transition: background var(--dur) var(--ease);
}
.task:hover { background: var(--surface-hover); }
.task__brand {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}
.task__main { flex: 1 1 auto; min-width: 0; }
.task__title-row { display: flex; align-items: center; gap: 8px; }
.task__title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-strong);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.task__status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--r-pill);
  flex: 0 0 auto;
}
.is-running { color: var(--brand); background: var(--brand-soft); }
.is-running :deep(.ico) { animation: spin 1s linear infinite; }
.is-done { color: var(--success); background: var(--success-soft); }
.is-failed { color: var(--danger); background: var(--danger-soft); }
.is-cancelled { color: var(--text-faint); background: var(--surface-sunken); }
.is-pending { color: var(--warn); background: var(--warn-soft); }
.task__meta { margin-top: 4px; font-size: 12px; color: var(--text-faint); display: block; }
.task__bar { display: block; margin-top: 8px; }
.task__stats { margin-top: 7px; font-size: 11.5px; color: var(--text-faint); display: block; }
.task__actions { display: flex; align-items: center; gap: 4px; flex: 0 0 auto; }
.task__act {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-faint);
  transition: all var(--dur) var(--ease);
}
.task__act:hover { background: var(--danger-soft); color: var(--danger); }
.task__arrow { color: var(--text-faint); }

.select {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  font-size: 13.5px;
  color: var(--text-strong);
  outline: none;
}
.select:focus {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px var(--brand-soft);
}
.form-grid-1 { display: flex; flex-direction: column; gap: 16px; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>