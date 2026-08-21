<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { t } from '@/i18n'
import AppIcon from '@/components/icons/AppIcon.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppField from '@/components/base/AppField.vue'
import AppModal from '@/components/base/AppModal.vue'

const auth = useAuthStore()
const ui = useUiStore()
const route = useRoute()
const router = useRouter()

const email = ref('')
const password = ref('')
const emailErr = ref('')
const oauthOpen = ref(false)
const oauthLoading = ref(false)

const FEATURES = [
  '本地扫盘 · 一键接入 · 可视化上架',
  '按 token 计费，拒绝月订阅',
  '企业版内网互相查看与调用',
]

function afterLogin(name: string) {
  ui.toast({ type: 'success', title: t('登录成功'), desc: t('欢迎回来，{name}', { name }) })
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
  router.push(redirect)
}

async function submitGoogleLike() {
  await auth.login('github', { name: '陈默', github: 'chenmo-dev', email: 'chenmo.dev@gmail.com', color: '#1a73e8' })
  afterLogin('陈默')
}

async function submitEmail() {
  if (!email.value.trim() || !password.value) {
    emailErr.value = t('请输入邮箱和密码')
    return
  }
  if (!/^\S+@\S+\.\S+$/.test(email.value.trim())) {
    emailErr.value = t('邮箱格式不正确')
    return
  }
  await auth.login('email', { name: '陈默', email: email.value.trim(), color: '#1a73e8' })
  afterLogin('陈默')
}

function demoSoon() {
  ui.toast({ type: 'info', title: t('演示环境'), desc: t('该链接为演示占位，不跳转外部页面') })
}
</script>

<template>
  <div class="auth">
    <section class="auth__brand">
      <div class="brand-inner">
        <div class="brand-logo"><span>R</span><span class="brand-logo__name">Re<em>solve</em></span></div>
        <h1 class="brand-title">{{ t('让每一个终端成为可调用的 AI 节点') }}</h1>
        <p class="brand-sub">{{ t('接入本地 Agent 与模型，按 token 按次付费，企业内网数据不出局域网。') }}</p>
        <ul class="brand-feats">
          <li v-for="f in FEATURES" :key="f">
            <AppIcon name="check-circle" :size="17" />
            <span>{{ t(f) }}</span>
          </li>
        </ul>
        <div class="brand-foot">{{ t('Resolve · AI Agent 协作平台') }}</div>
      </div>
    </section>

    <section class="auth__panel">
      <div class="panel-inner">
        <h2 class="panel-title">{{ t('欢迎回来') }}</h2>
        <p class="panel-sub">{{ t('登录 Resolve 控制台，管理你的 Agent 与节点') }}</p>

        <AppButton variant="dark" size="block" brand-icon="github" class="btn-github" @click="oauthOpen = true">
          {{ t('使用 GitHub 登录') }}
        </AppButton>

        <div class="auth-divider"><span>{{ t('或使用邮箱') }}</span></div>

        <form class="panel-form" @submit.prevent="submitEmail">
          <AppField label="邮箱" :error="emailErr">
            <AppInput v-model="email" type="email" :placeholder="t('邮箱地址')" autocomplete="email" />
          </AppField>
          <AppField :label="t('密码')">
            <AppInput v-model="password" type="password" placeholder="••••••••" autocomplete="current-password" />
          </AppField>
          <AppButton type="submit" variant="primary" size="block" class="btn-submit">{{ t('登录') }}</AppButton>
        </form>

        <p class="panel-switch">
          {{ t('还没有账号？') }}
          <RouterLink to="/register" class="panel-link">{{ t('立即注册') }}</RouterLink>
        </p>
        <p class="panel-terms">
          {{ t('登录即表示同意') }}
          <a href="javascript:void(0)" class="panel-link" @click="demoSoon">{{ t('服务条款') }}</a>
          {{ t('与') }}
          <a href="javascript:void(0)" class="panel-link" @click="demoSoon">{{ t('隐私政策') }}</a>
        </p>
      </div>
    </section>

    <AppModal v-model="oauthOpen" :title="t('授权登录 Resolve')" :subtitle="t('授权 GitHub 账号登录 Resolve 控制台')" :width="460" :sheet="false">
      <div class="oauth">
        <div class="oauth__url"><AppIcon name="lock" :size="13" /><span>github.com/login/oauth/authorize?client_id=resolve-demo</span></div>
        <div class="oauth__who">
          <AppIcon name="github" brand :size="34" />
          <div>
            <div class="oauth__name">陈默</div>
            <div class="oauth__desc">GitHub 账号 · chenmo-dev</div>
          </div>
        </div>
        <div class="oauth__hint">{{ t('Resolve 将代表你执行以下操作：') }}</div>
        <ul class="oauth__perms">
          <li><AppIcon name="check" :size="14" /><span>read:user {{ t('读取公开资料') }}</span></li>
          <li><AppIcon name="check" :size="14" /><span>public_repo {{ t('读取公开仓库') }}</span></li>
          <li><AppIcon name="check" :size="14" /><span>user:email {{ t('读取邮箱') }}</span></li>
        </ul>
        <p class="oauth__note">{{ t('这是演示流程，不会真实跳转 GitHub') }}</p>
      </div>
      <template #footer>
        <AppButton variant="ghost" @click="oauthOpen = false">{{ t('取消') }}</AppButton>
        <AppButton variant="primary" :loading="oauthLoading" @click="submitGoogleLike">{{ t('授权并登录') }}</AppButton>
      </template>
    </AppModal>
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
.brand-feats { margin-top: 30px; display: flex; flex-direction: column; gap: 13px; }
.brand-feats li { display: flex; align-items: center; gap: 10px; font-size: 13.5px; color: rgba(255, 255, 255, 0.9); }
.brand-foot {
  margin-top: 54px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}
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
.btn-github { margin-top: 28px; }
.auth-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 22px 0;
  color: var(--text-faint);
  font-size: 12px;
}
.auth-divider::before,
.auth-divider::after {
  content: '';
  flex: 1 1 auto;
  height: 1px;
  background: var(--border);
}
.panel-form { display: flex; flex-direction: column; gap: 16px; }
.btn-submit { margin-top: 6px; }
.panel-switch {
  margin-top: 22px;
  text-align: center;
  font-size: 13px;
  color: var(--text-mid);
}
.panel-terms {
  margin-top: 10px;
  text-align: center;
  font-size: 12px;
  color: var(--text-faint);
}
.panel-link { color: var(--brand); font-weight: 500; }
.panel-link:hover { text-decoration: underline; }

/* OAuth 弹窗 */
.oauth__url {
  display: flex;
  align-items: center;
  gap: 7px;
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 7px 11px;
  font-family: var(--font-mono);
  font-size: 11.5px;
  color: var(--text-weak);
  overflow: hidden;
}
.oauth__url span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.oauth__who {
  display: flex;
  align-items: center;
  gap: 13px;
  margin-top: 20px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-soft);
}
.oauth__name { font-size: 14px; font-weight: 600; color: var(--text-strong); }
.oauth__desc { font-size: 12px; color: var(--text-weak); margin-top: 2px; }
.oauth__hint { margin-top: 18px; font-size: 13px; color: var(--text-mid); }
.oauth__perms { margin-top: 10px; display: flex; flex-direction: column; gap: 9px; }
.oauth__perms li {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 13px;
  color: var(--text-mid);
}
.oauth__perms li :deep(.ico) { color: var(--success); }
.oauth__note {
  margin-top: 16px;
  font-size: 12px;
  color: var(--text-faint);
  background: var(--warn-soft);
  border: 1px solid var(--warn-line);
  border-radius: 8px;
  padding: 8px 11px;
}

@media (max-width: 900px) {
  .auth { grid-template-columns: 1fr; }
  .auth__brand { display: none; }
}
</style>