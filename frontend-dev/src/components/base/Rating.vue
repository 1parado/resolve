<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/icons/AppIcon.vue'

const props = defineProps<{ value: number }>()

const pct = computed(() => Math.max(0, Math.min(5, props.value)) / 5 * 100)
</script>

<template>
  <span class="rating" :aria-label="value.toFixed(1) + ' 分'">
    <span class="rating__base">
      <AppIcon v-for="i in 5" :key="i" name="star" :size="14" />
    </span>
    <span class="rating__fill" :style="{ width: pct + '%' }">
      <AppIcon v-for="i in 5" :key="i" name="star" :size="14" />
    </span>
  </span>
</template>

<style scoped>
.rating {
  position: relative;
  display: inline-flex;
  line-height: 0;
}
.rating__base,
.rating__fill {
  display: inline-flex;
  gap: 1px;
}
.rating__base :deep(.ico) {
  color: var(--border-strong);
  fill: var(--border-strong);
}
.rating__fill {
  position: absolute;
  inset: 0 auto 0 0;
  overflow: hidden;
  white-space: nowrap;
}
.rating__fill :deep(.ico) {
  color: #f59e0b;
  fill: #f59e0b;
}
</style>