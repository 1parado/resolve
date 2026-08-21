<script setup lang="ts">
import { computed } from 'vue'
import { buildIcon } from './registry'

const props = withDefaults(
  defineProps<{
    name: string
    size?: number
    sw?: number
    brand?: boolean
  }>(),
  { size: 18, sw: 1.8, brand: false },
)

const html = computed(() => buildIcon(props.name, props.size, props.brand ? 1.8 : props.sw))
</script>

<template>
  <span class="app-icon" :class="{ 'app-icon--brand': brand }" :aria-label="name" v-html="html" />
</template>

<style scoped>
.app-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  line-height: 0;
  font-size: 0;
}
.app-icon :deep(svg) {
  display: block;
}
</style>