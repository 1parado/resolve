<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useProfileStore } from '@/stores/profile'
import { useMarketStore } from '@/stores/market'
import { useUiStore } from '@/stores/ui'
import AppButton from '@/components/base/AppButton.vue'
import AppCard from '@/components/base/AppCard.vue'
import AppIcon from '@/components/icons/AppIcon.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppField from '@/components/base/AppField.vue'
import AppSegmented from '@/components/base/AppSegmented.vue'
import { marketApi } from '@/api'
import type { MarketCat } from '@/types'

const router = useRouter()
const profile = useProfileStore()
const market = useMarketStore()
const ui = useUiStore()

const agentId = ref(profile.agents[0]?.id || '')
const agent = computed(() => profile.agents.find((a) => a.id === agentId.value))
const name = ref((agent.value?.name || '') + ' 服务')
const cat = ref<MarketCat>('code')
const desc = ref('')
const tags = ref('')
const models = ref<string[]>(agent.value ? [...agent.value.models] : [])
const priceInput = ref('0.06')
const unit = ref<'千token' | '小时' | '次'>('千token')
const online = ref(true)
const submitting = ref(false)
const err = ref('')

const CATS: { value: MarketCat; label: string }[] = [
  { value: 'code', label: '代码生成' },
  { value: 'reason', label: '深度推理' },
  { value: 'ops', label: '本地算力' },
  { value: 'content', label: '内容创作' },
  { value: 'data', label: '数据分析' },
  { value: 'design', label: '设计视觉' },
]

function pickAgent(id: string) {
  agentId.value = id
  const a = profile.agents.find((x) => x.id === id)
  if (a) {
    models.value = [...a.models]
    if (name.value === '') name.value = a.name + ' 服务'
  }
}

function toggleModel(m: string) {
  if (models.value.includes(m)) models.value = models.value.filter((x) => x !== m)
  else models.value = [...models.value, m]
}

const unitSuffix = computed(() => (unit.value === '千token' ? '/千token' : unit.value === '小时' ? '/h' : '/次'))
const priceNum = computed(() => Number(priceInput.value) || 0)

async function submit() {
  if (!agent.value) return
  if (!name.value.trim()) {
    err.value = '请填写商品名称'
    return
  }
  if (priceNum.value <= 0) {
    err.value = '请填写正确的单价'
    return
  }
  if (models.value.length === 0) {
    err.value = '请至少选择一个可用模型'
    return
  }
  submitting.value = true
  try {
    const item = await marketApi.publish({
      cat: cat.value,
      name: name.value.trim(),
      vendor: profile.profile.name,
      vendorGithub: profile.profile.github,
      icon: agent.value.icon,
      accent: agent.value.accent,
      online: online.value,
      rating: 5,
      price: '¥' + priceNum.value + unitSuffix.value,
      priceNum: priceNum.value,
      tags: tags.value.split(/[,，]/).map((s) => s.trim()).filter(Boolean),
      models: models.value,
      desc: desc.value.trim() || '暂无简介',
      sla: '平均响应 1min · 成功率 99%',
    })
    market.addItem(item)
    ui.toast({ type: 'success', title: '上架成功', desc: item.name + ' 已发布到 Agent 市场' })
    router.push('/market')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="page page-narrow">
    <div class="page-head">
      <div>
        <h1 class="page-title">上架 Agent</h1>
        <p class="page-sub">把已接入的 Agent 发布到市场，设置定价与说明</p>
      </div>
    </div>

    <AppCard pad="lg">
      <div class="form-grid form-grid-2">
        <AppField label="选择 Agent" required>
          <select class="select" :value="agentId" @change="pickAgent(($event.target as HTMLSelectElement).value)">
            <option v-for="a in profile.agents" :key="a.id" :value="a.id">{{ a.name }}</option>
          </select>
        </AppField>
        <AppField label="商品名称" required>
          <AppInput v-model="name" placeholder="商品名称" />
        </AppField>

        <div class="form-span">
          <AppField label="分类" required>
            <AppSegmented :model-value="cat" :options="CATS.map((c) => ({ value: c.value, label: c.label }))" @update:model-value="(v: string) => (cat = v as MarketCat)" />
          </AppField>
        </div>

        <div class="form-span">
          <AppField label="简介" hint="展示在市场卡片与服务详情中">
            <textarea v-model="desc" class="textarea" rows="3" placeholder="一句话介绍这个 Agent 擅长什么" />
          </AppField>
        </div>

        <AppField label="标签" hint="用逗号分隔，最多 4 个">
          <AppInput v-model="tags" placeholder="例如：代码生成, 全栈, 审查" />
        </AppField>
        <AppField label="单价" required>
          <div class="price-row">
            <AppInput v-model="priceInput" type="number" min="0" step="0.01" style="flex: 1" />
            <select v-model="unit" class="select select-sm">
              <option value="千token">/千token</option>
              <option value="小时">/小时</option>
              <option value="次">/次</option>
            </select>
          </div>
        </AppField>

        <div class="form-span">
          <AppField label="可用模型" required hint="点击切换选择，将展示给调用方">
            <div class="model-chips">
              <button
                v-for="m in agent?.models || []"
                :key="m"
                type="button"
                class="chip"
                :class="{ on: models.includes(m) }"
                @click="toggleModel(m)"
              >
                <span class="chip__box"><AppIcon v-if="models.includes(m)" name="check" :size="12" /></span>
                {{ m }}
              </button>
            </div>
          </AppField>
        </div>

        <div class="form-span">
          <AppField label="可见性">
            <AppSegmented
              :model-value="online ? 'on' : 'off'"
              :options="[
                { value: 'on', label: '公开上架', icon: 'globe' },
                { value: 'off', label: '仅自己可见', icon: 'lock' },
              ]"
              @update:model-value="(v: string) => (online = v === 'on')"
            />
          </AppField>
        </div>
      </div>

      <p v-if="err" class="err">{{ err }}</p>

      <div class="foot">
        <AppButton variant="ghost" @click="router.push('/market')">取消</AppButton>
        <AppButton variant="primary" icon="upload" :loading="submitting" @click="submit">
          发布到市场 · ¥{{ priceNum }}<span style="font-size: 0.85em; margin-left: 2px">{{ unitSuffix }}</span>
        </AppButton>
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
.form-span { grid-column: 1 / -1; }
.price-row { display: flex; align-items: center; gap: 8px; }
.select-sm { width: 110px; flex: 0 0 auto; }
.model-chips { display: flex; gap: 8px; flex-wrap: wrap; }
.chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 12px;
  border-radius: var(--r-pill);
  background: var(--surface-soft);
  border: 1px solid var(--border);
  font-family: var(--font-mono);
  font-size: 12.5px;
  color: var(--text-mid);
  transition: all var(--dur) var(--ease);
}
.chip:hover { border-color: var(--brand-line); color: var(--text-strong); }
.chip.on {
  background: var(--brand-soft);
  border-color: var(--brand);
  color: var(--brand);
}
.chip__box {
  width: 16px;
  height: 16px;
  border-radius: 5px;
  border: 1px solid var(--border-strong);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  transition: all var(--dur) var(--ease);
}
.chip.on .chip__box { background: var(--brand); border-color: var(--brand); color: #fff; }
.err { margin-top: 16px; font-size: 12.5px; color: var(--danger); }
.foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid var(--border);
}
</style>