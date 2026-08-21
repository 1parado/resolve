<script setup lang="ts">
import { computed } from 'vue'
import { useUiStore } from '@/stores/ui'
import { t, isEn } from '@/i18n'

/* 纯 SVG 成交量热力图：53 列 × 7 行，末列底部对齐今天（GitHub 风格） */

const props = defineProps<{ data: number[] }>()
const ui = useUiStore()

const ROWS = 7
const COLS = 53
const CELL = 11
const GAP = 3
const PAD = 12
const TOTAL = CELL + GAP
const W = COLS * TOTAL - GAP + PAD * 2
const H = ROWS * TOTAL - GAP + 22

interface Cell {
  x: number
  y: number
  tip: string
  lvl: string
  today: boolean
}

function level(v: number): string {
  if (v <= 0) return 'l0'
  if (v <= 4) return 'l1'
  if (v <= 9) return 'l2'
  if (v <= 15) return 'l3'
  return 'l4'
}

const view = computed(() => {
  const data = props.data
  const months: { x: number; label: string }[] = []
  const cells: Cell[] = []
  if (!data || data.length !== ROWS * COLS) return { months, cells }
  const today = new Date()
  const todayRow = (today.getDay() + 6) % 7
  const start = new Date(today.getTime() - (data.length - 1) * 86400000)
  let lastMonth = -1
  for (let c = 0; c < COLS; c++) {
    const di0 = c * ROWS + 6 - todayRow
    if (di0 >= 0 && di0 < data.length) {
      const d0 = new Date(start.getTime() + di0 * 86400000)
      if (d0.getMonth() !== lastMonth) {
        lastMonth = d0.getMonth()
        months.push({ x: PAD + c * TOTAL + 1, label: isEn() ? String(d0.getMonth() + 1) : d0.getMonth() + 1 + t('月') })
      }
    }
  }
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      const idx = c * ROWS + r + 6 - todayRow
      if (idx < 0 || idx >= data.length) continue
      const v = data[idx]
      const d = new Date(start.getTime() + idx * 86400000)
      const datePart = isEn() ? d.getMonth() + 1 + '/' + d.getDate() : d.getMonth() + 1 + '月' + d.getDate() + '日'
      cells.push({
        x: c * TOTAL,
        y: r * TOTAL,
        tip: datePart + ' · ' + v + t('单成交'),
        lvl: level(v),
        today: idx === data.length - 1,
      })
    }
  }
  return { months, cells }
})

function onCellTap(c: Cell) {
  if (window.innerWidth > 820) return
  ui.toast({ type: 'info', title: c.tip })
}
</script>

<template>
  <div class="heat">
    <div class="heat-scroll">
      <svg
        :viewBox="`0 0 ${W} ${H}`"
        :width="W"
        :height="H"
        role="img"
        :aria-label="t('近 53 周每日成交量热力图')"
      >
        <g class="heat-months">
          <text
            v-for="m in view.months"
            :key="m.x"
            :x="m.x"
            y="10"
            class="heat-month"
          >{{ m.label }}</text>
        </g>
        <g :transform="`translate(${PAD},20)`">
          <rect
            v-for="c in view.cells"
            :key="c.x + '-' + c.y"
            :class="['heat-cell', c.lvl, { today: c.today }]"
            :x="c.x"
            :y="c.y"
            :width="CELL"
            :height="CELL"
            rx="2.6"
            @click="onCellTap(c)"
          >
            <title>{{ c.tip }}</title>
          </rect>
        </g>
      </svg>
    </div>
    <div class="heat-foot">
      <span class="heat-legend">
        <span class="heat-month">{{ t('少') }}</span>
        <span v-for="l in ['l0', 'l1', 'l2', 'l3', 'l4']" :key="l" :class="['heat-cell', l]" class="lg" />
        <span class="heat-month">{{ t('多') }}</span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.heat { width: 100%; }
.heat-scroll { overflow-x: auto; overflow-y: hidden; padding-bottom: 4px; }
.heat :deep(svg) { display: block; }
.heat-month {
  font-family: var(--font-mono);
  font-size: 10px;
  fill: var(--text-faint);
  letter-spacing: 0.03em;
}
.heat-foot {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}
.heat-legend {
  display: flex;
  align-items: center;
  gap: 4px;
}
.heat-legend .heat-month { font-size: 11px; }
.heat-legend .lg { margin-left: 2px; }

.heat-cell {
  fill: var(--heat-l0);
  transition: fill 0.15s var(--ease);
}
.l1 { fill: var(--heat-l1); }
.l2 { fill: var(--heat-l2); }
.l3 { fill: var(--heat-l3); }
.l4 { fill: var(--heat-l4); }
.heat-cell:hover { stroke: rgba(17, 24, 39, 0.55); stroke-width: 1.2; }
.heat-cell.today { stroke: var(--brand); stroke-width: 1.4; }
</style>