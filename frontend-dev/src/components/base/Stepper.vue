<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/icons/AppIcon.vue'

const props = defineProps<{
  steps: string[]
  current: number
}>()

const list = computed(() =>
  props.steps.map((label, i) => ({
    label,
    state: i < props.current ? 'done' : i === props.current ? 'current' : 'todo',
  })),
)
</script>

<template>
  <ol class="stepper">
    <li v-for="(s, i) in list" :key="i" class="stepper__item" :class="'is-' + s.state">
      <span class="stepper__dot">
        <AppIcon v-if="s.state === 'done'" name="check" :size="13" />
        <template v-else>{{ i + 1 }}</template>
      </span>
      <span class="stepper__label">{{ s.label }}</span>
      <span v-if="i < list.length - 1" class="stepper__line" />
    </li>
  </ol>
</template>

<style scoped>
.stepper {
  display: flex;
  align-items: flex-start;
  width: 100%;
}
.stepper__item {
  position: relative;
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.stepper__dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  font-size: 12.5px;
  font-weight: 600;
  background: var(--surface-soft);
  color: var(--text-faint);
  border: 1px solid var(--border);
  z-index: 1;
}
.stepper__label {
  font-size: 12px;
  color: var(--text-weak);
  white-space: nowrap;
}
.is-current .stepper__dot {
  background: #fff;
  border-color: var(--brand);
  color: var(--brand);
  box-shadow: 0 0 0 3px var(--brand-soft);
}
.is-current .stepper__label { color: var(--text-strong); font-weight: 600; }
.is-done .stepper__dot {
  background: var(--brand);
  border-color: var(--brand);
  color: #fff;
}
.is-done .stepper__label { color: var(--text-mid); }
.stepper__line {
  position: absolute;
  top: 13px;
  left: 50%;
  width: 100%;
  height: 2px;
  background: var(--border);
  z-index: 0;
}
.is-done + .stepper__item .stepper__line,
.stepper__item.is-done ~ .stepper__item .stepper__line { background: transparent; }
.stepper__item.is-done .stepper__line { background: var(--brand); }
</style>