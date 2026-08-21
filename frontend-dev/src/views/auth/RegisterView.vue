<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { t } from '@/i18n'
import AppIcon from '@/components/icons/AppIcon.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppField from '@/components/base/AppField.vue'

const auth = useAuthStore()
const ui = useUiStore()
const router = useRouter()

const name = ref('')
const email = ref('')
const code = ref('')
const password = ref('')
const err = ref('')

function sendCode() {
  if (!/^\S+@\S+\.\S+$/.test(email.value.trim())) {
    err.value = t('请先输入正确的邮箱')
    return
  }
  ui.toast({ type: 'info', title: t('验证码已发送（模拟）'), desc: t('演示环境验证码：123456') })
}

async function submit() {
  if (!name.value.trim() || !email.value.trim() || !password.value) {
    err.value = t('请填写昵称、邮箱与密码')
    return
  }
  if (code.value.trim() !== '123456') {
    err.value = t('验证码不正确（演示环境为 123456）')
    return
  }
  await auth.login('email', { name: name.value.trim(), email: email.value.trim(), color: '#1a73e8' })
  ui.toast({ type: 'success', title: t('注册成功'), desc: t('欢迎加入 Resolve，{name}', { name: name.value.trim() }) })
  router.push('/')
}
</script>

<template>
  <div class="auth">
    <section class="auth__brand">
      <div class="brand-inner">
        <div class="brand-logo"><span>R</span><span class="brand-logo__name">Re<em>solve</em></span></div>
        <h1 class="brand-title">{{ t('让每一个终端成为可调用的 AI 节点') }}</h1>
        <p class="brand-sub">{{ t('接入本地 Agent 与模型，按 token 按次付费，企业内网数据不出局域网。') }}</p>
        <div class="brand-foot">{{ t('Resolve · AI Agent 协作平台') }}</div>
      </div>
    </section>

    <section class="auth__panel">
      <div class="panel-inner">
        <h2 class="panel-title">{{ t('创建账号') }}</h2>
        <p class="panel-sub">{{ t('注册 Resolve 控制台，开始接入与调用 Agent') }}</p>

        <form class="panel-form" @submit.prevent="submit">
          <AppField :label="t('昵称')" required>
            <AppInput v-model="name" :placeholder="t('你的昵称')" />
          </AppField>
          <AppField :label="t('邮箱')" required>
            <AppInput v-model="email" type="email" :placeholder="t('邮箱地址')" autocomplete="email" />
          </AppField>
          <AppField :label="t('验证码')" required>
            <div class="code-row">
              <AppInput v-model="code" style="flex: 1" :placeholder="t('6 位验证码')" :maxlength="6" />
              <AppButton variant="ghost" size="md" @click="sendCode">{{ t('获取验证码') }}</AppButton>
            </div>
          </AppField>
          <AppField :label="t('密码')" required>
            <AppInput v-model="password" type="password" :placeholder="t('至少 6 位')" autocomplete="new-password" />
          </AppField>
          <p v-if="err" class="form-err">{{ err }}</p>
          <AppButton type="submit" variant="primary" size="block">{{ t('创建账号') }}</AppButton>
        </form>

        <p class="panel-switch">
          {{ t('已有账号？') }}
          <RouterLink to="/login" class="panel-link">{{ t('去登录') }}</RouterLink>
        </p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.auth {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  background: #fff;
}
.auth__brand {
  background: var(--brand-grad);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
}
.brand-inner { max-width: 420px; width: 100%; }
.brand-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 44px;
}
.brand-logo > span:first-child {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
}
.brand-logo__name {
  font-family: var(--font-display);
  font-size: 21px;
  font-weight: 600;
}
.brand-logo__name em { font-style: normal; font-weight: 700; }
.brand-title {
  font-family: var(--font-display);
  font-size: 30px;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: -0.02em;
  color: #fff;
}
.brand-sub {
  margin-top: 14px;
  font-size: 14px;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.72);
}
.brand-foot { margin-top: 54px; font-size: 12px; color: rgba(255, 255, 255, 0.5); }
.auth__panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
}
.panel-inner { max-width: 400px; width: 100%; }
.panel-title {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 700;
  color: var(--text-strong);
}
.panel-sub { margin-top: 6px; font-size: 13px; color: var(--text-weak); }
.panel-form { margin-top: 28px; display: flex; flex-direction: column; gap: 16px; }
.code-row { display: flex; align-items: center; gap: 8px; width: 100%; }
.form-err { font-size: 12.5px; color: var(--danger); }
.panel-switch { margin-top: 22px; text-align: center; font-size: 13px; color: var(--text-mid); }
.panel-link { color: var(--brand); font-weight: 500; }
.panel-link:hover { text-decoration: underline; }

@media (max-width: 900px) {
  .auth { grid-template-columns: 1fr; }
  .auth__brand { display: none; }
}
</style>