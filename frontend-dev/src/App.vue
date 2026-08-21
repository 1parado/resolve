<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useUiStore } from '@/stores/ui'
import ToastHost from '@/components/base/ToastHost.vue'

const ui = useUiStore()

onMounted(() => {
  ui.setMobile(window.innerWidth <= 900)
  const mq = window.matchMedia('(max-width: 900px)')
  const onChange = () => ui.setMobile(mq.matches)
  mq.addEventListener?.('change', onChange)
})
</script>

<template>
  <RouterView />
  <ToastHost />
</template>