<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTasksStore } from '@/stores/tasks'
import { useUiStore } from '@/stores/ui'
import AppIcon from '@/components/icons/AppIcon.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppCard from '@/components/base/AppCard.vue'
import AppTag from '@/components/base/AppTag.vue'
import ProgressBar from '@/components/base/ProgressBar.vue'
import EmptyState from '@/components/base/EmptyState.vue'
import { t } from '@/i18n'
import { fmtNum, timeAgo } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const tasks = useTasksStore()
const ui = useUiStore()

const task = computed(() => tasks.items.find((t) => t.id === route.params.id))
const steps = computed(() => [
  { label: t('任务创建'), done: true },
  { label: t('环境准备与上下文加载'), done: task.value ? task.value.progress >= 30 : false },
  { label: t('执行中'), done: task.value ? task.value.progress >= 90 : false },
  { label: t('结果产出与计费'), done: task.value ? task.value.status === 'done' : false },
])

const logs = computed(() => {
  if (!task.value) return []
  const base = [
    task.value.status === 'done' ? t('任务完成，输出已归档') : t('正在执行任务，进度 {p}%', { p: task.value.progress }),
    t('已加载上下文：仓库结构 + 相关文件'),
    t('已选用模型并结合任务提示词生成方案'),
  ]
  if (task.value.status === 'failed') base.unshift(t('执行中断：上下文窗口不足，已自动重试一次'))
  return base
})

const pricePerK = computed(() => {
  if (!task.value || task.value.cost === 0) return '—'
  return '¥' + (task.value.cost / Math.max(1, task.value.tokens / 1000)).toFixed(2) + '/' + t('千token')
})

async function cancelTask() {
  if (!task.value) return
  await tasks.cancel(task.value.id)
  ui.toast({ type: 'info', title: t('已终止任务') })
}

async function rerunTask() {
  if (!task.value) return
  await tasks.rerun(task.value.id)
  ui.toast({ type: 'info', title: t('任务重新执行中') })
}
</script>

<template>
  <div class="page">
    <EmptyState
      v-if="!task"
      icon="help-circle"
      :title="t('未找到该任务')"
      :desc="t('任务可能已被删除。')"
      :action-text="t('返回任务中心')"
      @action="router.push('/tasks')"
    />

    <template v-else>
      <div class="page-head">
        <div>
          <button class="back" @click="router.push('/tasks')">
            <AppIcon name="chev-left" :size="15" />
            <span>{{ t('返回任务中心') }}</span>
          </button>
          <h1 class="page-title">{{ task.title }}</h1>
          <p class="page-sub">
            {{ task.agent }} · {{ task.type === 'schedule' ? (task.schedule || t('定时执行')) : t('一次性') }} · {{ t('创建于 {d}', { d: timeAgo(task.created) }) }}
          </p>
        </div>
      </div>

      <div class="grid grid-main-side main-grid">
        <div class="stack stack-16">
          <AppCard>
            <template #head>
              <div class="card-title"><AppIcon name="cpu" :size="16" class="ico" /><span>{{ t('执行进度') }}</span></div>
              <AppTag v-if="task.status === 'running'" variant="brand" dot>{{ t('执行中') }}</AppTag>
              <AppTag v-else-if="task.status === 'done'" variant="success" dot>{{ t('已完成') }}</AppTag>
              <AppTag v-else-if="task.status === 'failed'" variant="danger" dot>{{ t('失败') }}</AppTag>
              <AppTag v-else variant="warn" dot>{{ task.status === 'cancelled' ? t('已终止') : t('排队中') }}</AppTag>
            </template>
            <div class="prog">
              <ProgressBar :value="task.progress" :height="8" :color="task.status === 'failed' ? 'var(--danger)' : task.status === 'done' ? 'var(--success)' : undefined" />
              <div class="prog__row">
                <span class="num">{{ task.progress }}%</span>
                <span>{{ task.status === 'done' ? t('已完成') : t('预计还需 2-5 分钟') }}</span>
              </div>
            </div>
            <div class="steps">
              <div v-for="(s, i) in steps" :key="i" class="step" :class="{ on: s.done }">
                <span class="step__dot"><AppIcon v-if="s.done" name="check" :size="12" /></span>
                <span class="step__label">{{ s.label }}</span>
              </div>
            </div>
          </AppCard>

          <AppCard>
            <template #head>
              <div class="card-title"><AppIcon name="terminal" :size="16" class="ico" /><span>{{ t('执行日志') }}</span></div>
            </template>
            <div class="logs">
              <div v-for="(l, i) in logs" :key="i" class="log mono">
                <span class="log__t">{{ String(i + 1).padStart(2, '0') }}</span>
                <span>{{ l }}</span>
              </div>
              <div v-if="task.status === 'running'" class="log mono log--dim">
                <span class="log__t">&gt;</span>
                <span>{{ t('等待 Agent 输出…') }}</span>
              </div>
            </div>
          </AppCard>
        </div>

        <div class="stack stack-16">
          <AppCard>
            <template #head>
              <div class="card-title"><AppIcon name="gauge" :size="16" class="ico" /><span>{{ t('任务统计') }}</span></div>
            </template>
            <div class="stats">
              <div class="stat"><span>{{ t('消耗 token') }}</span><b class="num">{{ fmtNum(task.tokens) }}</b></div>
              <div class="stat"><span>{{ t('执行费用') }}</span><b class="num">¥{{ task.cost.toFixed(2) }}</b></div>
              <div class="stat"><span>{{ t('折算单价') }}</span><b class="num">{{ pricePerK }}</b></div>
              <div class="stat"><span>{{ t('执行 Agent') }}</span><b>{{ task.agent }}</b></div>
            </div>
          </AppCard>

          <AppCard>
            <template #head>
              <div class="card-title"><AppIcon name="zap" :size="16" class="ico" /><span>{{ t('操作') }}</span></div>
            </template>
            <div class="ops">
              <AppButton v-if="task.status === 'running' || task.status === 'pending'" variant="danger" size="block" icon="x" @click="cancelTask">{{ t('终止任务') }}</AppButton>
              <AppButton v-if="task.status === 'failed' || task.status === 'cancelled'" variant="primary" size="block" icon="refresh" @click="rerunTask">{{ t('重新执行') }}</AppButton>
              <AppButton variant="ghost" size="block" icon="chat" @click="ui.toast({ type: 'info', title: t('讨论功能即将上线'), desc: t('后续可围绕任务进行多轮对话') })">{{ t('与任务讨论') }}</AppButton>
            </div>
          </AppCard>
        </div>
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
.main-grid { margin-top: 16px; }

.prog__row { display: flex; justify-content: space-between; margin-top: 8px; font-size: 12px; color: var(--text-faint); }
.steps { display: flex; flex-direction: column; gap: 10px; margin-top: 18px; }
.step { display: flex; align-items: center; gap: 10px; }
.step__dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid var(--border-strong);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex: 0 0 auto;
}
.step.on .step__dot { background: var(--brand); border-color: var(--brand); }
.step__label { font-size: 13px; color: var(--text-faint); }
.step.on .step__label { color: var(--text-strong); }

.logs {
  background: var(--surface-code);
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 220px;
  overflow-y: auto;
}
.log {
  display: flex;
  gap: 10px;
  font-size: 12px;
  color: #b6c3d6;
  line-height: 1.5;
}
.log__t { color: #5b7285; flex: 0 0 auto; }
.log--dim { opacity: 0.6; }

.stats { display: flex; flex-direction: column; }
.stat {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px dashed var(--border);
  font-size: 13px;
  color: var(--text-mid);
}
.stat:last-child { border-bottom: none; }
.stat b { color: var(--text-strong); }
.ops { display: flex; flex-direction: column; gap: 8px; }
</style>