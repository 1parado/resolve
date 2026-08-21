<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '@/stores/wallet'
import { useUiStore } from '@/stores/ui'
import AppIcon from '@/components/icons/AppIcon.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppCard from '@/components/base/AppCard.vue'
import AppTag from '@/components/base/AppTag.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppField from '@/components/base/AppField.vue'
import AppModal from '@/components/base/AppModal.vue'
import AppSegmented from '@/components/base/AppSegmented.vue'
import ProgressBar from '@/components/base/ProgressBar.vue'
import { money, timeAgo } from '@/utils/format'

const router = useRouter()
const wallet = useWalletStore()
const ui = useUiStore()

const rechargeOpen = ref(false)
const withdrawOpen = ref(false)
const amount = ref('')
const method = ref<'微信' | '支付宝'>('微信')
const busy = ref(false)

const PRESETS = [50, 100, 200, 500]
const MONTH_BUDGET = 500

const budgetPct = computed(() => Math.min(100, Math.round((wallet.wallet.monthCost / MONTH_BUDGET) * 100)))
const amountNum = computed(() => Number(amount.value) || 0)

async function doRecharge() {
  if (amountNum.value <= 0) {
    ui.toast({ type: 'warn', title: '请输入充值金额' })
    return
  }
  busy.value = true
  try {
    await wallet.recharge(amountNum.value, method.value)
    ui.toast({ type: 'success', title: '充值成功', desc: method.value + ' 到账 ' + money(amountNum.value) })
    rechargeOpen.value = false
    amount.value = ''
  } finally {
    busy.value = false
  }
}

async function doWithdraw() {
  if (amountNum.value <= 0) {
    ui.toast({ type: 'warn', title: '请输入提现金额' })
    return
  }
  if (amountNum.value > wallet.wallet.balance) {
    ui.toast({ type: 'warn', title: '余额不足', desc: '可提现金额 ' + money(wallet.wallet.balance) })
    return
  }
  busy.value = true
  try {
    await wallet.withdraw(amountNum.value)
    ui.toast({ type: 'success', title: '提现成功', desc: '已转出 ' + money(amountNum.value) + ' 至银行卡' })
    withdrawOpen.value = false
    amount.value = ''
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1 class="page-title">钱包</h1>
        <p class="page-sub">余额实时结算，按 token 按次计费，可随时充值提现</p>
      </div>
    </div>

    <div class="grid grid-main-side main-grid">
      <div class="stack stack-16">
        <AppCard pad="lg" class="bal-card">
          <template #head>
            <div class="card-title"><AppIcon name="wallet" :size="16" class="ico" /><span>可用余额</span></div>
            <AppTag variant="brand">实名已认证</AppTag>
          </template>
          <div class="bal">
            <div class="bal__amt num">{{ money(wallet.wallet.balance) }}</div>
            <div class="bal__row">
              <span>本月已消费</span>
              <b class="num">{{ money(wallet.wallet.monthCost) }}</b>
            </div>
            <div class="bal__row">
              <span>本月预算</span>
              <b class="num">{{ money(MONTH_BUDGET) }}</b>
            </div>
            <ProgressBar :value="budgetPct" :height="8" class="bal__bar" />
            <div class="bal__hint">已使用 <b class="num">{{ budgetPct }}%</b> 额度，超额部分将提醒</div>
          </div>
          <div class="bal__actions">
            <AppButton variant="primary" icon="plus" @click="rechargeOpen = true">充值</AppButton>
            <AppButton variant="ghost" icon="download" @click="withdrawOpen = true">提现</AppButton>
            <AppButton variant="ghost" icon="list" @click="router.push('/wallet/billing')">全部账单</AppButton>
          </div>
        </AppCard>

        <AppCard>
          <template #head>
            <div class="card-title"><AppIcon name="info" :size="16" class="ico" /><span>计费说明</span></div>
          </template>
          <ul class="fees">
            <li>调用第三方 Agent 按商家定价与真实用量结算，从余额实时扣费</li>
            <li>充值与提现均为演示流程，不会产生真实资金变动</li>
            <li>首次充值的用户将获得 10 元体验金</li>
          </ul>
        </AppCard>
      </div>

      <AppCard pad="none">
        <template #head>
          <div class="card-title"><AppIcon name="trending-up" :size="16" class="ico" /><span>最近流水</span></div>
          <AppButton variant="ghost" size="sm" @click="router.push('/wallet/billing')">全部</AppButton>
        </template>
        <div class="txs">
          <div v-for="b in wallet.billing.slice(0, 8)" :key="b.id" class="list-row tx-row">
            <span class="tx-row__ico" :class="'tx-' + b.type">
              <AppIcon :name="b.type === 'call' ? 'zap' : b.type === 'recharge' ? 'coins' : 'arrow-up-right'" :size="15" />
            </span>
            <div class="list-row__main">
              <div class="list-row__title">{{ b.type === 'call' ? '调用 · ' + b.agent : b.type === 'recharge' ? '充值 · ' + b.agent : '提现 · ' + b.agent }}</div>
              <div class="list-row__sub">{{ timeAgo(b.time) }} · {{ b.method }}</div>
            </div>
            <span class="num" :class="b.amount > 0 ? 'num-up' : 'num-down'">{{ b.amount > 0 ? '+' : '' }}{{ money(b.amount) }}</span>
          </div>
        </div>
      </AppCard>
    </div>

    <!-- 充值 -->
    <AppModal v-model="rechargeOpen" title="充值余额" subtitle="支持微信与支付宝，实时到账" :width="440">
      <div class="pay">
        <AppField label="充值金额">
          <div class="presets">
            <button v-for="p in PRESETS" :key="p" type="button" class="preset" :class="{ on: amountNum === p }" @click="amount = String(p)">
              {{ money(p) }}
            </button>
            <button type="button" class="preset preset--custom" :class="{ on: !PRESETS.includes(amountNum) && amountNum > 0 }" @click="amount = ''">
              自定义
            </button>
          </div>
        </AppField>
        <div class="pay__custom">
          <AppInput v-model="amount" type="number" min="1" placeholder="输入充值金额" />
        </div>
        <AppField label="支付方式">
          <AppSegmented
            :model-value="method"
            :options="[
              { value: '微信', label: '微信支付', brandIcon: 'wechat' },
              { value: '支付宝', label: '支付宝', brandIcon: 'alipay' },
            ]"
            @update:model-value="(v: string) => (method = v as '微信' | '支付宝')"
          />
        </AppField>
      </div>
      <template #footer>
        <AppButton variant="ghost" @click="rechargeOpen = false">取消</AppButton>
        <AppButton variant="primary" icon="plus" :loading="busy" @click="doRecharge">确认充值 {{ amountNum > 0 ? money(amountNum) : '' }}</AppButton>
      </template>
    </AppModal>

    <!-- 提现 -->
    <AppModal v-model="withdrawOpen" title="提现到银行卡" subtitle="可提现 ' + money(wallet.wallet.balance) + '，T+1 到账" :width="440">
      <div class="pay">
        <AppField label="提现金额">
          <AppInput v-model="amount" type="number" min="1" :placeholder="'最多可提 ' + money(wallet.wallet.balance)" />
        </AppField>
        <div class="pay__note">
          <AppIcon name="lock" :size="14" />
          <span>提现需要完成实名认证，且单笔不低于 1 元</span>
        </div>
      </div>
      <template #footer>
        <AppButton variant="ghost" @click="withdrawOpen = false">取消</AppButton>
        <AppButton variant="primary" icon="download" :loading="busy" @click="doWithdraw">确认提现</AppButton>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.main-grid { margin-top: 0; }
.bal-card {}
.bal__amt { font-size: 34px; font-weight: 700; letter-spacing: -0.02em; color: var(--text-strong); }
.bal__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  font-size: 12.5px;
  color: var(--text-mid);
}
.bal__row b { color: var(--text-strong); }
.bal__bar { margin-top: 12px; }
.bal__hint { margin-top: 7px; font-size: 11.5px; color: var(--text-faint); }
.bal__actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.fees { display: flex; flex-direction: column; gap: 9px; }
.fees li {
  position: relative;
  padding-left: 16px;
  font-size: 12.5px;
  color: var(--text-weak);
  line-height: 1.6;
}
.fees li::before {
  content: '';
  position: absolute;
  left: 2px;
  top: 8px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--brand);
}

.txs { padding: 4px 20px 10px; }
.tx-row { padding: 12px 0; }
.tx-row__ico {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}
.tx-call { background: var(--brand-soft); color: var(--brand); }
.tx-recharge { background: var(--success-soft); color: var(--success); }
.tx-withdraw { background: var(--warn-soft); color: var(--warn); }

.presets { display: flex; gap: 8px; flex-wrap: wrap; }
.preset {
  padding: 8px 16px;
  border-radius: 10px;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-mid);
  transition: all var(--dur) var(--ease);
}
.preset.on {
  background: var(--brand-soft);
  border-color: var(--brand);
  color: var(--brand);
}
.preset--custom { color: var(--text-weak); font-weight: 500; }
.pay__custom { margin-top: 10px; }
.pay__note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  color: var(--text-faint);
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: 9px;
  padding: 9px 11px;
  margin-top: 14px;
}
.pay__note :deep(.ico) { color: var(--text-faint); margin-top: 1px; }
</style>