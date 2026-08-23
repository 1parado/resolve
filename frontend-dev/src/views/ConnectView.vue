<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useProfileStore } from '@/stores/profile'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import AppIcon from '@/components/icons/AppIcon.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppCard from '@/components/base/AppCard.vue'
import AppTag from '@/components/base/AppTag.vue'
import AppSwitch from '@/components/base/AppSwitch.vue'
import AppSegmented from '@/components/base/AppSegmented.vue'
import AppInput from '@/components/base/AppInput.vue'
import Stepper from '@/components/base/Stepper.vue'
import EmptyState from '@/components/base/EmptyState.vue'
import { marketApi, profileApi } from '@/api'
import { t } from '@/i18n'
import type { LocalAgentInfo } from '@/types'

const router = useRouter()
const profile = useProfileStore()
const auth = useAuthStore()
const ui = useUiStore()

/** 步骤：0 创建节点 → 1 运行并扫描 → 2 上架市场 */
const step = ref(0)
const mode = ref<'mock' | 'cli'>('mock')
const visibility = ref<'public' | 'enterprise'>('public')
const nodeName = ref('')
const publishing = ref(false)
const polling = ref(false)
const rescanning = ref(false)
const publishingAgents = ref(false)
const copied = ref(false)
const picked = ref<Record<string, boolean>>({})
let pollTimer: ReturnType<typeof setInterval> | null = null

const STEPS = computed(() => [t('创建节点'), t('运行并扫描'), t('上架市场')])

/** 各本地 Agent 的品牌展示 */
const AGENT_META: Record<string, { icon: string; accent: string }> = {
  codex: { icon: 'zap', accent: '#10a37f' },
  claude: { icon: 'chat', accent: '#d97757' },
  openclaw: { icon: 'layers', accent: '#8b5cf6' },
  gemini: { icon: 'globe', accent: '#4285f4' },
}
function meta(a: LocalAgentInfo) {
  return AGENT_META[a.id] || { icon: 'cpu', accent: '#6366f1' }
}

/** 节点代理上报的本机 Agent 扫描结果 */
const scanned = computed<LocalAgentInfo[]>(() => profile.node.agentsInfo || [])
const pickedList = computed(() => scanned.value.filter((a) => picked.value[a.id]))
const pickedCount = computed(() => pickedList.value.length)

onMounted(() => {
  profile.refresh().finally(() => {
    if (!nodeName.value) nodeName.value = `${profile.profile.name}的主节点`
    if (profile.node.published) step.value = 1
  })
})
onUnmounted(() => stopPolling())

/** 步骤 0：发布节点（生成接入命令所需的 NODE_ID/USER_ID/TOKEN） */
async function createNode() {
  publishing.value = true
  try {
    await profile.publish({
      name: nodeName.value.trim() || `${profile.profile.name}的主节点`,
      ip: '本机',
      port: '',
      runtime: 'node-agent · 本地扫描',
      os: profile.profile.os.id,
      visibility: visibility.value,
      agents: [],
      published: true,
    })
    step.value = 1
  } catch (e) {
    ui.toast({ type: 'warn', title: t('发布失败'), desc: (e as Error).message })
  } finally {
    publishing.value = false
  }
}

/** 在 B 电脑上运行节点代理的真实接入命令（含本机扫描） */
const connectCommand = computed(() => {
  const n = profile.node
  const uid = auth.user?.id || ''
  const token = n.token || ''
  return [
    'cd backend/node-agent',
    '$env:SERVER_URL="ws://localhost:4000/ws"',
    `$env:NODE_ID="${n.id}"`,
    `$env:USER_ID="${uid}"`,
    `$env:TOKEN="${token}"`,
    `$env:NODE_NAME="${n.name || nodeName.value}"`,
    `$env:EXEC_MODE="${mode.value}"   # mock=演示 / cli=调用本机真实 Agent`,
    'npm run dev',
  ].join('\n')
})

async function copyCommand() {
  try {
    await navigator.clipboard.writeText(connectCommand.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
    ui.toast({ type: 'success', title: t('已复制'), desc: t('在 B 电脑终端执行，代理会自动扫描本机 Agent 并上线') })
  } catch {
    ui.toast({ type: 'warn', title: t('复制失败'), desc: t('请手动复制命令') })
  }
}

/** 步骤 1：轮询节点上线状态 */
function startPolling() {
  if (pollTimer) return
  polling.value = true
  const tick = async () => {
    try {
      await profile.refresh()
    } catch {
      /* 忽略瞬时错误 */
    }
    if (profile.node.connected) stopPolling()
  }
  tick()
  pollTimer = setInterval(tick, 2500)
}
function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  polling.value = false
}

/** 请求节点代理重新扫描本机 Agent */
async function rescan() {
  rescanning.value = true
  try {
    await profileApi.scanNode()
    ui.toast({ type: 'success', title: t('已请求重新扫描'), desc: t('节点代理正在本机扫描，稍后自动刷新') })
    setTimeout(() => profile.refresh(), 3000)
  } catch (e) {
    ui.toast({ type: 'warn', title: t('重新扫描失败'), desc: (e as Error).message })
  } finally {
    rescanning.value = false
  }
}

/** 步骤 2：一键把勾选的本地 Agent 上架到市场 */
async function publishPicked() {
  const list = pickedList.value
  if (!list.length) return
  publishingAgents.value = true
  const ok: string[] = []
  const fail: string[] = []
  for (const a of list) {
    try {
      await marketApi.publish({
        cat: 'code',
        name: `本地 ${a.name}`,
        vendor: profile.profile.name,
        vendorGithub: profile.profile.github,
        icon: meta(a).icon,
        accent: meta(a).accent,
        online: true,
        rating: 5,
        price: '¥0.05/次',
        priceNum: 5,
        tags: [a.id, '本地', '实时'],
        models: [a.id, 'cli'],
        desc: `${profile.node.name} 上的本地 ${a.name}${a.version ? '（' + a.version + '）' : ''}，由 node-agent 在本机真实执行，支持实时流式输出。`,
        sla: '平均响应 1min · 实时流式输出',
      })
      ok.push(a.name)
    } catch {
      fail.push(a.name)
    }
  }
  publishingAgents.value = false
  if (ok.length) {
    ui.toast({ type: 'success', title: t('上架成功'), desc: t('已上架 {n} 个 Agent', { n: ok.length }) })
    step.value = 2
  }
  if (fail.length) ui.toast({ type: 'warn', title: t('部分上架失败'), desc: fail.join('、') })
}
</script>

<template>
  <div class="page page-narrow">
    <div class="page-head">
      <div>
        <h1 class="page-title">{{ t('接入 Agent') }}</h1>
        <p class="page-sub">{{ t('在本机运行一行命令，自动扫描本地已安装的 Codex / Claude Code / OpenClaw / Gemini，发布为可调用的真实节点') }}</p>
      </div>
    </div>

    <AppCard pad="lg" class="flow-card">
      <Stepper :steps="STEPS" :current="step" />
    </AppCard>

    <!-- 步骤 0：创建节点 -->
    <div v-if="step === 0" class="stack stack-16">
      <AppCard pad="lg">
        <div class="form-grid">
          <div class="form-field">
            <div class="form-field__label">{{ t('节点名称') }}</div>
            <AppInput v-model="nodeName" :placeholder="t('如：我的主力电脑')" />
          </div>
          <div class="form-field">
            <div class="form-field__label">{{ t('执行模式') }}</div>
            <AppSegmented
              :model-value="mode"
              :options="[
                { value: 'mock', label: t('演示模式'), icon: 'play' },
                { value: 'cli', label: t('真实调用'), icon: 'terminal' },
              ]"
              @update:model-value="(v: string) => (mode = v as 'mock' | 'cli')"
            />
            <p class="form-field__hint">
              {{ mode === 'cli' ? t('将真实调用本机安装的 codex / claude 等 Agent（需已登录）') : t('分阶段输出演示执行过程，适合先跑通链路') }}
            </p>
          </div>
          <div class="form-field">
            <div class="form-field__label">{{ t('可见范围') }}</div>
            <AppSegmented
              :model-value="visibility"
              :options="[
                { value: 'public', label: t('全网公开'), icon: 'globe' },
                { value: 'enterprise', label: t('仅企业内网'), icon: 'lock' },
              ]"
              @update:model-value="(v: string) => (visibility = v as 'public' | 'enterprise')"
            />
          </div>
        </div>
        <div class="form-actions">
          <AppButton variant="primary" icon="send" :loading="publishing" @click="createNode">
            {{ t('创建节点并生成接入命令') }}
          </AppButton>
        </div>
      </AppCard>
    </div>

    <!-- 步骤 1：运行代理 + 自动扫描 -->
    <div v-if="step === 1" class="stack stack-16">
      <AppCard pad="lg">
        <template #head>
          <div class="card-title">
            <AppIcon name="terminal" :size="16" class="ico" />
            <span>{{ t('在本机运行节点代理（会自动扫描本地 Agent）') }}</span>
          </div>
          <AppButton variant="ghost" size="sm" icon="copy" @click="copyCommand">
            {{ copied ? t('已复制') : t('复制命令') }}
          </AppButton>
        </template>
        <pre class="cmd mono">{{ connectCommand }}</pre>
        <div class="cmd-tip">
          <p>
            {{ t('在 B 电脑终端粘贴执行。代理会：① 连接中心服务器上线；② 自动扫描本机已安装的 Agent（codex / claude / openclaw / gemini）；③ 把扫描结果上报到这里。') }}
          </p>
          <p class="cmd-tip__sub">{{ t('切换执行模式后需在 B 电脑重启代理命令才会生效。') }}</p>
        </div>
        <div class="cmd-actions">
          <AppButton variant="primary" icon="refresh" :loading="polling" @click="startPolling">
            {{ polling ? t('等待节点上线…') : t('我已在本机运行') }}
          </AppButton>
        </div>
      </AppCard>

      <AppCard v-if="profile.node.connected" pad="none">
        <template #head>
          <div class="card-title">
            <AppIcon name="server" :size="16" class="ico" />
            <span>{{ profile.node.name || t('我的节点') }}</span>
          </div>
          <AppTag variant="success" dot>{{ t('在线') }}</AppTag>
        </template>
        <div class="scan-body">
          <div class="scan-title">
            <div>
              <div class="scan-title__main">{{ t('已发现 {n} 个本地 Agent', { n: scanned.length }) }}</div>
              <div class="scan-title__sub">{{ t('勾选要发布到市场的 Agent') }}</div>
            </div>
            <AppButton variant="ghost" size="sm" icon="refresh" :loading="rescanning" @click="rescan">
              {{ t('重新扫描') }}
            </AppButton>
          </div>

          <div v-if="scanned.length" class="devs">
            <div v-for="a in scanned" :key="a.id" class="dev">
              <span class="dev__brand" :style="{ background: meta(a).accent + '1f', color: meta(a).accent }">
                <AppIcon :name="meta(a).icon" :size="19" />
              </span>
              <div class="dev__main">
                <div class="dev__name">{{ a.name }}</div>
                <div class="dev__meta mono">{{ a.version || '—' }} · {{ a.path }}</div>
              </div>
              <AppTag :variant="a.authed ? 'success' : 'default'" :dot="a.authed">
                {{ a.authed ? t('已登录') : t('未登录') }}
              </AppTag>
              <AppSwitch :model-value="!!picked[a.id]" :disabled="!a.authed" @update:model-value="(v: boolean) => (picked[a.id] = v)" />
            </div>
            <p v-if="scanned.some((a) => !a.authed)" class="devs__hint">
              {{ t('未登录的 Agent 无法真实执行：请先在 B 电脑上登录该 CLI（如 codex login / claude），再点「重新扫描」。') }}
            </p>
          </div>
          <EmptyState
            v-else
            icon="scan"
            :title="t('本机未检测到 Agent')"
            :desc="t('请确认 B 电脑已安装 codex / claude / openclaw / gemini 且已加入 PATH，然后点击「重新扫描」')"
          />

          <div v-if="pickedCount" class="publish-bar">
            <span class="publish-bar__count">{{ t('已选 {n} 个 Agent', { n: pickedCount }) }}</span>
            <AppButton variant="primary" icon="send" :loading="publishingAgents" @click="publishPicked">
              {{ t('一键上架到市场') }}
            </AppButton>
          </div>
        </div>
      </AppCard>

      <AppCard v-else pad="lg" class="waiting-card">
        <div class="waiting">
          <span class="waiting__icon" :class="{ spin: polling }"><AppIcon name="scan" :size="22" /></span>
          <div>
            <div class="waiting__title">{{ polling ? t('正在等待节点上线…') : t('节点尚未上线') }}</div>
            <div class="waiting__desc">{{ t('在 B 电脑终端运行上方命令后，点击「我已在本机运行」开始检测') }}</div>
          </div>
        </div>
      </AppCard>
    </div>

    <!-- 步骤 2：完成 -->
    <AppCard v-if="step === 2" pad="lg">
      <div class="hero-done">
        <span class="hero-done__icon"><AppIcon name="check-circle" :size="32" /></span>
        <div class="hero-done__title">{{ t('已上架到 Agent 市场') }}</div>
        <p class="hero-done__desc">
          {{ t('「{n}」已发布，绑定节点「{node}」。保持 B 电脑节点代理运行，其他用户即可调用。', { n: pickedList.map((a) => '本地 ' + a.name).join('、'), node: profile.node.name }) }}
        </p>
        <div class="hero-done__actions">
          <AppButton icon="market" @click="router.push('/market')">{{ t('去 Agent 市场') }}</AppButton>
          <AppButton variant="ghost" icon="user" @click="router.push('/u/' + auth.user?.id)">{{ t('查看个人主页') }}</AppButton>
        </div>
      </div>
    </AppCard>
  </div>
</template>

<style scoped>
.flow-card { margin-bottom: 16px; }
.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-strong);
}
.ico { color: var(--brand); }

.form-grid { display: flex; flex-direction: column; gap: 16px; }
.form-field__label { font-size: 13px; font-weight: 600; color: var(--text-mid); margin-bottom: 8px; }
.form-field__hint { margin: 8px 0 0; font-size: 12px; color: var(--text-faint); }
.form-actions { margin-top: 18px; display: flex; justify-content: flex-end; }

.cmd {
  margin: 0;
  padding: 14px;
  border-radius: 10px;
  background: #0d1117;
  color: #c9d1d9;
  font-size: 12px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-all;
}
.cmd-tip { margin: 12px 0 0; font-size: 12.5px; color: var(--text-weak); line-height: 1.7; }
.cmd-tip__sub { margin: 6px 0 0; color: var(--text-faint); }
.cmd-actions { margin-top: 14px; }

.scan-body { padding: 4px 20px 14px; }
.scan-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 0 6px;
}
.scan-title__main { font-size: 14px; font-weight: 600; color: var(--text-strong); }
.scan-title__sub { margin-top: 2px; font-size: 12px; color: var(--text-faint); }

.devs { display: flex; flex-direction: column; gap: 2px; }
.dev {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 10px;
  border-radius: 12px;
}
.dev:hover { background: var(--surface-hover); }
.dev__brand {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}
.dev__main { flex: 1 1 auto; min-width: 0; }
.dev__name { font-size: 13.5px; font-weight: 600; color: var(--text-strong); }
.dev__meta { margin-top: 3px; font-size: 11px; color: var(--text-faint); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.devs__hint { margin: 4px 10px 0; font-size: 12px; color: var(--warn); }

.publish-bar {
  position: sticky;
  bottom: 12px;
  margin-top: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: var(--sh-2);
  padding: 12px 16px;
  z-index: 2;
}
.publish-bar__count { font-size: 13px; color: var(--text-mid); }

.waiting-card { background: var(--surface-soft); }
.waiting { display: flex; align-items: center; gap: 14px; }
.waiting__icon {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--brand);
  background: var(--brand-soft);
  flex: 0 0 auto;
}
.waiting__icon.spin :deep(.ico) { animation: spin 1.2s linear infinite; }
.waiting__title { font-size: 14px; font-weight: 600; color: var(--text-strong); }
.waiting__desc { margin-top: 4px; font-size: 12.5px; color: var(--text-weak); }
@keyframes spin { to { transform: rotate(360deg); } }

.hero-done { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 26px 10px; }
.hero-done__icon {
  width: 62px;
  height: 62px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--success);
  background: var(--success-soft);
  margin-bottom: 14px;
}
.hero-done__title { font-size: 16px; font-weight: 600; color: var(--text-strong); }
.hero-done__desc { margin: 8px 0 20px; max-width: 460px; font-size: 13px; color: var(--text-weak); line-height: 1.7; }
.hero-done__actions { display: flex; gap: 10px; margin-top: 8px; }
</style>
