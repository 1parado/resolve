<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useProfileStore } from '@/stores/profile'
import { useUiStore } from '@/stores/ui'
import AppIcon from '@/components/icons/AppIcon.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppCard from '@/components/base/AppCard.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppField from '@/components/base/AppField.vue'
import AppModal from '@/components/base/AppModal.vue'
import AppSwitch from '@/components/base/AppSwitch.vue'
import AppTag from '@/components/base/AppTag.vue'
import AppSegmented from '@/components/base/AppSegmented.vue'
import { t, locale, setLocale } from '@/i18n'

const router = useRouter()
const auth = useAuthStore()
const profile = useProfileStore()
const ui = useUiStore()

const pwdOpen = ref(false)
const oldPwd = ref('')
const newPwd = ref('')
const confirmPwd = ref('')

const notify = ref({
  call: localStorage.getItem('resolve.notify.call') !== '0',
  recharge: localStorage.getItem('resolve.notify.recharge') !== '0',
  system: localStorage.getItem('resolve.notify.system') === '1',
})

function toggleNotify(key: 'call' | 'recharge' | 'system', v: boolean) {
  notify.value[key] = v
  localStorage.setItem('resolve.notify.' + key, v ? '1' : '0')
  ui.toast({ type: 'success', title: t('已更新'), desc: t('通知偏好已保存') })
}

function changePwd() {
  if (!newPwd.value || newPwd.value.length < 6) {
    ui.toast({ type: 'warn', title: t('密码过短'), desc: t('新密码至少 6 位') })
    return
  }
  if (newPwd.value !== confirmPwd.value) {
    ui.toast({ type: 'warn', title: t('两次输入不一致'), desc: t('请确认新密码') })
    return
  }
  ui.toast({ type: 'success', title: t('密码已修改'), desc: t('下次登录请使用新密码') })
  pwdOpen.value = false
  oldPwd.value = newPwd.value = confirmPwd.value = ''
}

function logout() {
  auth.logout()
  ui.toast({ type: 'info', title: t('已退出登录') })
  router.push('/login')
}
</script>

<template>
  <div class="page page-narrow">
    <div class="page-head">
      <div>
        <h1 class="page-title">{{ t('设置') }}</h1>
        <p class="page-sub">{{ t('账户信息、通知偏好与安全设置') }}</p>
      </div>
    </div>

    <div class="stack stack-16">
      <AppCard pad="lg">
        <template #head>
          <div class="card-title"><AppIcon name="user" :size="16" class="ico" /><span>{{ t('基本资料') }}</span></div>
          <AppTag variant="brand">{{ auth.user?.provider === 'github' ? t('GitHub 登录') : t('邮箱登录') }}</AppTag>
        </template>
        <div class="form-grid form-grid-2">
          <AppField :label="t('昵称')">
            <AppInput :model-value="profile.profile.name" disabled />
          </AppField>
          <AppField label="GitHub">
            <AppInput :model-value="profile.profile.github" disabled />
          </AppField>
          <AppField :label="t('邮箱')">
            <AppInput :model-value="auth.user?.email || '—'" disabled />
          </AppField>
          <AppField :label="t('加入时间')">
            <AppInput :model-value="profile.profile.joined" disabled />
          </AppField>
        </div>
        <p class="hint">{{ t('资料修改请前往「编辑资料」，昵称与邮箱属于平台账户信息，暂不支持自助更换') }}</p>
      </AppCard>

      <AppCard pad="lg">
        <template #head>
          <div class="card-title"><AppIcon name="globe" :size="16" class="ico" /><span>{{ t('语言') }}</span></div>
        </template>
        <div class="sett">
          <div class="sett__main">
            <div class="sett__label">{{ t('界面语言') }}</div>
            <div class="sett__desc">{{ t('切换后立即生效，并保存在此浏览器') }}</div>
          </div>
          <AppSegmented
            :model-value="locale"
            :options="[
              { value: 'zh', label: '中文' },
              { value: 'en', label: 'English' },
            ]"
            @update:model-value="(v: string) => setLocale(v as 'zh' | 'en')"
          />
        </div>
      </AppCard>

      <AppCard pad="lg">
        <template #head>
          <div class="card-title"><AppIcon name="bell" :size="16" class="ico" /><span>{{ t('通知设置') }}</span></div>
        </template>
        <div class="setts">
          <div class="sett">
            <div class="sett__main">
              <div class="sett__label">{{ t('Agent 调用成功') }}</div>
              <div class="sett__desc">{{ t('有人调用你的 Agent 时通知') }}</div>
            </div>
            <AppSwitch :model-value="notify.call" @update:model-value="(v: boolean) => toggleNotify('call', v)" />
          </div>
          <div class="sett">
            <div class="sett__main">
              <div class="sett__label">{{ t('充值到账') }}</div>
              <div class="sett__desc">{{ t('余额变动与充值结果通知') }}</div>
            </div>
            <AppSwitch :model-value="notify.recharge" @update:model-value="(v: boolean) => toggleNotify('recharge', v)" />
          </div>
          <div class="sett">
            <div class="sett__main">
              <div class="sett__label">{{ t('系统公告') }}</div>
              <div class="sett__desc">{{ t('版本更新、停机维护等公告') }}</div>
            </div>
            <AppSwitch :model-value="notify.system" @update:model-value="(v: boolean) => toggleNotify('system', v)" />
          </div>
        </div>
      </AppCard>

      <AppCard pad="lg">
        <template #head>
          <div class="card-title"><AppIcon name="shield" :size="16" class="ico" /><span>{{ t('安全') }}</span></div>
        </template>
        <div class="sec">
          <div class="sec__row">
            <div class="sec__main">
              <div class="sec__label">{{ t('登录密码') }}</div>
              <div class="sec__desc">{{ t('建议定期更换密码') }}</div>
            </div>
            <AppButton variant="ghost" size="sm" @click="pwdOpen = true">{{ t('修改密码') }}</AppButton>
          </div>
          <div class="sec__row">
            <div class="sec__main">
              <div class="sec__label">{{ t('当前会话') }}</div>
              <div class="sec__desc">{{ t('本机浏览器保持登录状态') }}</div>
            </div>
            <AppTag variant="success" dot>{{ t('正常') }}</AppTag>
          </div>
        </div>
      </AppCard>

      <AppCard pad="lg" class="danger-card">
        <template #head>
          <div class="card-title"><AppIcon name="logout" :size="16" class="ico" /><span>{{ t('退出登录') }}</span></div>
        </template>
        <p class="danger-desc">{{ t('退出后本地演示数据保留，下次登录仍可使用。') }}</p>
        <AppButton variant="danger" icon="logout" @click="logout">{{ t('退出当前账号') }}</AppButton>
      </AppCard>
    </div>

    <AppModal v-model="pwdOpen" :title="t('修改密码')" :subtitle="t('修改后下次登录使用新密码')" :width="420">
      <div class="form-stack">
        <AppField :label="t('当前密码')">
          <AppInput v-model="oldPwd" type="password" :placeholder="t('输入当前密码')" />
        </AppField>
        <AppField :label="t('新密码')">
          <AppInput v-model="newPwd" type="password" :placeholder="t('至少 6 位')" />
        </AppField>
        <AppField :label="t('确认新密码')">
          <AppInput v-model="confirmPwd" type="password" :placeholder="t('再次输入新密码')" />
        </AppField>
      </div>
      <template #footer>
        <AppButton variant="ghost" @click="pwdOpen = false">{{ t('取消') }}</AppButton>
        <AppButton variant="primary" @click="changePwd">{{ t('确认修改') }}</AppButton>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.hint {
  margin-top: 14px;
  font-size: 12px;
  color: var(--text-faint);
  background: var(--surface-soft);
  border-radius: 9px;
  padding: 9px 12px;
}
.setts { display: flex; flex-direction: column; }
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

.sec { display: flex; flex-direction: column; }
.sec__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}
.sec__row:last-child { border-bottom: none; }
.sec__label { font-size: 13.5px; font-weight: 500; color: var(--text-strong); }
.sec__desc { margin-top: 3px; font-size: 12px; color: var(--text-faint); }

.form-stack { display: flex; flex-direction: column; gap: 16px; }
.danger-desc { font-size: 13px; color: var(--text-mid); margin-bottom: 14px; }
</style>