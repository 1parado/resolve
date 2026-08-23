<script setup lang="ts">
/**
 * TaskTerminal —— 实时执行终端（A/B 双方共用）
 * 通过 SSE 订阅任务进度，逐行渲染为终端风格日志。
 */
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { runtimeApi } from '@/api'
import type { RuntimeResult } from '@/api'
import { t } from '@/i18n'

const props = defineProps<{
  taskId: string
  initialLog?: string
  status?: string
  agent?: string
}>()

const emit = defineEmits<{
  (e: 'finish', r: RuntimeResult): void
  (e: 'fail', msg: string): void
}>()

const content = ref(props.initialLog || '')
const status = ref(props.status || 'running')
const box = ref<HTMLElement | null>(null)
let close: (() => void) | null = null

const isRunning = computed(() => status.value === 'running')

function append(text: string) {
  content.value += text
  if (content.value.length > 500_000) content.value = content.value.slice(-500_000)
}

async function scrollToBottom() {
  await nextTick()
  if (box.value) box.value.scrollTop = box.value.scrollHeight
}

onMounted(() => {
  if (props.status === 'running') {
    close = runtimeApi.subscribe(props.taskId, {
      onProgress: (delta) => {
        append(delta)
        scrollToBottom()
      },
      onResult: (r) => {
        status.value = r.status
        append(r.output)
        scrollToBottom()
        emit('finish', r)
      },
      onFail: (msg) => {
        status.value = 'failed'
        append(`\n[系统] ${msg}\n`)
        scrollToBottom()
        emit('fail', msg)
      },
    })
  } else {
    // 历史任务：展示已有日志
    scrollToBottom()
  }
})

onUnmounted(() => {
  close?.()
})

watch(() => content.value, scrollToBottom)
</script>

<template>
  <div class="task-term">
    <div class="task-term__bar">
      <span class="task-term__agent mono">{{ agent || taskId }}</span>
      <span class="task-term__status" :class="'st-' + status">
        <i />
        {{ status === 'running' ? t('执行中') : status === 'done' ? t('已完成') : status === 'failed' ? t('失败') : status }}
      </span>
    </div>
    <div ref="box" class="task-term__screen mono">
      <template v-if="content">
        <div v-for="(line, i) in content.split('\n')" :key="i" class="task-term__line">
          <span v-if="isRunning && i === content.split('\n').length - 1 && line === ''" class="caret" />
          {{ line || ' ' }}
        </div>
      </template>
      <div v-else class="task-term__wait">
        <span class="caret" />{{ t('等待执行输出…') }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.task-term { width: 100%; }
.task-term__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 12px;
  background: #0a0e14;
  border: 1px solid #1f2632;
  border-bottom: none;
  border-radius: 10px 10px 0 0;
}
.task-term__agent { font-size: 12px; color: #7d8a99; }
.task-term__status { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: #7d8a99; }
.task-term__status i { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
.st-running i { background: #f0b429; animation: blink 1s infinite; }
.st-done i { background: #34d399; }
.st-failed i { background: #f87171; }
.st-timeout i { background: #f87171; }
@keyframes blink { 50% { opacity: 0.2; } }

.task-term__screen {
  height: 300px;
  overflow: auto;
  background: #0a0e14;
  border: 1px solid #1f2632;
  border-radius: 0 0 10px 10px;
  padding: 12px 14px;
  font-size: 12.5px;
  line-height: 1.75;
  color: #c9d1d9;
  white-space: pre-wrap;
  word-break: break-all;
}
.task-term__line { min-height: 1.4em; }
.task-term__wait { color: #5b6675; }
.caret { display: inline-block; width: 7px; height: 13px; background: #58a6ff; vertical-align: -2px; margin-right: 4px; animation: blink 1s infinite; }
</style>
