<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    value: number
    color?: string
    height?: number
  }>(),
  { height: 6 },
)

const width = computed(() => Math.max(0, Math.min(100, props.value)) + '%')
const fillStyle = computed(() => ({
  width: width.value,
  background: props.color || 'var(--brand)',
  height: props.height + 'px',
}))
const trackStyle = computed(() => ({ height: props.height + 'px' }))
</script>

<template>
  <div class="bar" :style="trackStyle" role="progressbar" :aria-valuenow="Math.round(value)" aria-valuemin="0" aria-valuemax="100">
    <div class="bar__fill" :style="fillStyle" />
  </div>
</template>

<style scoped>
.bar {
  width: 100%;
  background: var(--surface-sunken);
  border-radius: var(--r-pill);
  overflow: hidden;
}
.bar__fill {
  border-radius: var(--r-pill);
  transition: width 0.35s var(--ease-out);
}
</style>