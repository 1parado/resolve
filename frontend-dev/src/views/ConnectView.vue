<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useProfileStore } from '@/stores/profile'
import { useUiStore } from '@/stores/ui'
import AppIcon from '@/components/icons/AppIcon.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppCard from '@/components/base/AppCard.vue'
import AppTag from '@/components/base/AppTag.vue'
import AppSwitch from '@/components/base/AppSwitch.vue'
import AppSegmented from '@/components/base/AppSegmented.vue'
import Stepper from '@/components/base/Stepper.vue'
import { t } from '@/i18n'
import { hexA } from '@/utils/format'
import type { Agent } from '@/types'

interface Candidate {
  agent: Agent
  host: string
  port: string
  runtime: string
  picked: boolean
}

const router = useRouter()
const profile = useProfileStore()
const ui = useUiStore()

const step = ref(0)
const scanning = ref(false)
const publishing = ref(false)
const picks = ref<Candidate[]>([])
const visibility = ref<'public' | 'enterprise'>('public')

const STEPS = computed(() => [t('扫描设备'), t('配置节点'), t('发布上线')])

function buildCandidates() {
  picks.value = profile.agents.map((a, i) => ({
    agent: a,
    host: '192.168.1.' + (10 + i * 3),
    port: String(41500 + i * 37),
    runtime: a.id === 'openclaw' ? 'openclaw-runtime' : a.id === 'codex' ? 'vllm · python3' : 'turbo · node',
    picked: true,
  }))
}

async function startScan() {
  scanning.value = true
  await new Promise((r) => setTimeout(r, 1600))
  buildCandidates()
  scanning.value = false
  step.value = 1
}

const pickedCount = computed(() => picks.value.filter((p) => p.picked).length)

async function publish() {
  if (pickedCount.value === 0) {
    ui.toast({ type: 'warn', title: t('请至少选择一个 Agent') })
    return
  }
  publishing.value = true
  const picked = picks.value.filter((p) => p.picked)
  await profile.publish({
    name: profile.profile.name + t('的主节点'),
    ip: picked[0].host,
    port: picked[0].port,
    runtime: picked.map((p) => p.agent.name).join(' · '),
    os: profile.profile.os.label,
    visibility: visibility.value,
    agents: picked.map((p) => p.agent.name),
  })
  publishing.value = false
  step.value = 2
  ui.toast({ type: 'success', title: t('发布成功'), desc: t('节点已上线，可在个人主页查看与调用') })
}
</script>

<template>
  <div class="page page-narrow">
    <div class="page-head">
      <div>
        <h1 class="page-title">{{ t('接入 Agent') }}</h1>
        <p class="page-sub">{{ t('扫描局域网或云端设备，把本地 Agent 发布为可调用的在线节点') }}</p>
      </div>
    </div>

    <AppCard pad="lg" class="flow-card">
      <Stepper :steps="STEPS" :current="step" />
    </AppCard>

    <!-- 已接入提示 -->
    <AppCard v-if="profile.node.connected && step !== 2" class="conn-card">
      <template #head>
        <div class="card-title">
          <AppIcon name="server" :size="16" class="ico" />
          <span>{{ t('当前已接入节点') }}</span>
        </div>
        <AppTag variant="success" dot>{{ t('在线') }}</AppTag>
      </template>
      <div class="conn-body">
        <div class="conn-name">{{ profile.node.name }}</div>
        <div class="conn-ip mono">{{ profile.node.ip }}:{{ profile.node.port }}</div>
        <div class="conn-actions">
          <AppButton variant="ghost" size="sm" icon="refresh" @click="startScan">{{ t('重新扫描配置') }}</AppButton>
        </div>
      </div>
    </AppCard>

    <!-- 步骤 0：扫描 -->
    <AppCard v-if="step === 0" pad="lg">
      <div class="hero-scan">
        <span class="hero-scan__icon" :class="{ spin: scanning }">
          <AppIcon name="scan" :size="30" />
        </span>
        <div class="hero-scan__title">{{ scanning ? t('正在扫描局域网设备…') : t('扫描本地与云端设备') }}</div>
        <p class="hero-scan__desc">
          {{ t('将自动发现安装了 Resolve 运行时的 Agent（Codex、Claude Code、OpenClaw、Hermes），支持多设备接入。') }}
        </p>
        <AppButton variant="primary" icon="scan" :loading="scanning" @click="startScan">{{ t('开始扫描') }}</AppButton>
      </div>
    </AppCard>

    <!-- 步骤 1：配置 -->
    <div v-if="step === 1" class="stack stack-16">
      <AppCard pad="none">
        <template #head>
          <div class="card-title">
            <AppIcon name="cpu" :size="16" class="ico" />
            <span>{{ t('发现 {n} 个 Agent', { n: picks.length }) }}</span>
          </div>
          <span class="card-sub">{{ t('勾选要上线的设备') }}</span>
        </template>
        <div class="devs">
          <div v-for="(p, i) in picks" :key="p.agent.id" class="dev">
            <span class="dev__brand" :style="{ background: hexA(p.agent.accent, 0.12) }">
              <AppIcon :name="p.agent.icon" brand :size="19" />
            </span>
            <div class="dev__main">
              <div class="dev__name">{{ p.agent.name }}</div>
              <div class="dev__meta mono">{{ p.host }}:{{ p.port }} · {{ p.runtime }}</div>
            </div>
            <AppSwitch :model-value="p.picked" @update:model-value="(v: boolean) => (picks[i].picked = v)" />
          </div>
        </div>
      </AppCard>

      <AppCard pad="lg">
        <div class="form-row">
          <div class="form-row__label">{{ t('可见范围') }}</div>
          <AppSegmented
            :model-value="visibility"
            :options="[
              { value: 'public', label: t('全网公开'), icon: 'globe' },
              { value: 'enterprise', label: t('仅企业内网'), icon: 'lock' },
            ]"
            @update:model-value="(v: string) => (visibility = v as 'public' | 'enterprise')"
          />
        </div>
      </AppCard>

      <div class="publish-bar">
        <span class="publish-bar__count">{{ t('已选 {n} 个 Agent', { n: pickedCount }) }}</span>
        <AppButton variant="primary" icon="send" :loading="publishing" :disabled="pickedCount === 0" @click="publish">
          {{ t('发布并激活') }}
        </AppButton>
      </div>
    </div>

    <!-- 步骤 2：完成 -->
    <AppCard v-if="step === 2" pad="lg">
      <div class="hero-done">
        <span class="hero-done__icon"><AppIcon name="check-circle" :size="32" /></span>
        <div class="hero-done__title">{{ t('节点已上线') }}</div>
        <p class="hero-done__desc">
          {{ profile.node.name }} · {{ profile.node.ip }}:{{ profile.node.port }}，{{ t('已关联 {n} 个 Agent', { n: profile.node.agents.length }) }}。
        </p>
        <div class="hero-done__actions">
          <AppButton icon="user" @click="router.push('/u/chenmo-dev')">{{ t('查看个人主页') }}</AppButton>
          <AppButton variant="ghost" @click="router.push('/market')">{{ t('去 Agent 市场') }}</AppButton>
        </div>
      </div>
    </AppCard>
  </div>
</template>

<style scoped>
.flow-card { margin-bottom: 16px; }
.conn-card { margin-bottom: 16px; }
.conn-body { padding: 2px 0 6px; }
.conn-name { font-size: 14px; font-weight: 600; color: var(--text-strong); }
.conn-ip { margin-top: 4px; font-size: 12.5px; color: var(--text-weak); }
.conn-actions { margin-top: 12px; }

.hero-scan { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 30px 10px; }
.hero-scan__icon {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--brand);
  background: var(--brand-soft);
  margin-bottom: 16px;
}
.hero-scan__icon.spin :deep(.ico) { animation: spin 1s linear infinite; }
.hero-scan__title { font-size: 16px; font-weight: 600; color: var(--text-strong); }
.hero-scan__desc { margin: 8px 0 20px; max-width: 440px; font-size: 13px; color: var(--text-weak); line-height: 1.7; }
@keyframes spin { to { transform: rotate(360deg); } }

.devs { padding: 4px 8px; }
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
.dev__meta { margin-top: 3px; font-size: 11.5px; color: var(--text-weak); }

.form-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
.form-row__label { font-size: 13px; font-weight: 500; color: var(--text-mid); }

.publish-bar {
  position: sticky;
  bottom: 12px;
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
.publish-bar__count b { color: var(--brand); }

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
.hero-done__desc { margin: 8px 0 20px; font-size: 13px; color: var(--text-weak); }
.hero-done__actions { display: flex; gap: 10px; }
</style>