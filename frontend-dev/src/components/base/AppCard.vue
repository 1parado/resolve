<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    pad?: 'none' | 'sm' | 'md' | 'lg'
    hover?: boolean
  }>(),
  { pad: 'md', hover: false },
)

const cls = computed(() => ['app-card', 'pad-' + props.pad, { 'is-hover': props.hover }])
</script>

<template>
  <section :class="cls">
    <header v-if="$slots.head" class="app-card__head"><slot name="head" /></header>
    <div v-if="$slots.default" class="app-card__body"><slot /></div>
  </section>
</template>

<style scoped>
.app-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  box-shadow: var(--sh-1);
}
.pad-none { padding: 0; }
.pad-sm { padding: 14px 16px; }
.pad-md { padding: 20px; }
.pad-lg { padding: 26px; }
.is-hover { transition: box-shadow var(--dur) var(--ease), transform var(--dur) var(--ease); }
.is-hover:hover {
  box-shadow: var(--sh-3);
  transform: translateY(-2px);
}
.app-card__head {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.app-card__head + .app-card__body { padding-top: 16px; }
</style>