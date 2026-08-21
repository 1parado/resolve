<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useProfileStore } from '@/stores/profile'
import { useUiStore } from '@/stores/ui'
import { t } from '@/i18n'
import AppButton from '@/components/base/AppButton.vue'
import AppCard from '@/components/base/AppCard.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppField from '@/components/base/AppField.vue'
import type { OSId } from '@/types'

const router = useRouter()
const profile = useProfileStore()
const ui = useUiStore()

const name = ref(profile.profile.name)
const github = ref(profile.profile.github)
const job = ref(profile.profile.job)
const bio = ref(profile.profile.bio)
const osId = ref<OSId>(profile.profile.os.id)
const osLabel = ref(profile.profile.os.label)
const err = ref('')

const OS_OPTIONS: { id: OSId; label: string }[] = [
  { id: 'apple', label: 'macOS 15.1' },
  { id: 'windows', label: 'Windows 11' },
  { id: 'linux', label: 'Linux Ubuntu 24.04' },
]

function onOsChange(e: Event) {
  const id = (e.target as HTMLSelectElement).value as OSId
  osId.value = id
  osLabel.value = OS_OPTIONS.find((o) => o.id === id)?.label || id
}

async function save() {
  if (!name.value.trim()) {
    err.value = t('昵称不能为空')
    return
  }
  await profile.edit({
    name: name.value.trim(),
    github: github.value.trim() || 'chenmo-dev',
    job: job.value.trim(),
    bio: bio.value.trim(),
    os: { id: osId.value, label: osLabel.value },
  })
  ui.toast({ type: 'success', title: t('已保存'), desc: t('个人资料已更新') })
  router.push('/u/chenmo-dev')
}
</script>

<template>
  <div class="page page-narrow">
    <div class="page-head">
      <div>
        <h1 class="page-title">{{ t('编辑资料') }}</h1>
        <p class="page-sub">{{ t('维护你的公开身份信息，其他用户可见') }}</p>
      </div>
    </div>

    <AppCard pad="lg">
      <div class="form-grid form-grid-2">
        <AppField :label="t('昵称')" required>
          <AppInput v-model="name" :placeholder="t('你的昵称')" />
        </AppField>
        <AppField :label="t('GitHub 用户名')">
          <AppInput v-model="github" placeholder="chenmo-dev" />
        </AppField>
        <AppField :label="t('职业 / 头衔')" :hint="t('显示在个人主页姓名下方')">
          <AppInput v-model="job" :placeholder="t('全栈工程师 · 独立 Agent 开发者')" />
        </AppField>
        <AppField :label="t('常用操作系统')">
          <select class="select" :value="osId" @change="onOsChange">
            <option v-for="o in OS_OPTIONS" :key="o.id" :value="o.id">{{ o.label }}</option>
          </select>
        </AppField>
        <AppField :label="t('个人简介')" :hint="t('一句话介绍你的 Agent 服务')">
          <textarea v-model="bio" class="textarea" rows="4" />
        </AppField>
      </div>
      <p v-if="err" class="err">{{ err }}</p>
      <div class="foot">
        <AppButton variant="ghost" @click="router.push('/u/chenmo-dev')">{{ t('取消') }}</AppButton>
        <AppButton variant="primary" icon="check" @click="save">{{ t('保存修改') }}</AppButton>
      </div>
    </AppCard>
  </div>
</template>

<style scoped>
.select,
.textarea {
  width: 100%;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  font-size: 13.5px;
  color: var(--text-strong);
  outline: none;
  transition: border-color var(--dur) var(--ease), box-shadow var(--dur) var(--ease);
}
.select { height: 40px; padding: 0 12px; }
.textarea { padding: 11px 14px; resize: vertical; line-height: 1.6; }
.select:focus,
.textarea:focus {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px var(--brand-soft);
}
.err { margin-top: 14px; font-size: 12.5px; color: var(--danger); }
.foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid var(--border);
}
</style>