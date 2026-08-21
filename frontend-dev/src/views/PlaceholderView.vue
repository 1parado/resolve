<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import EmptyState from '@/components/base/EmptyState.vue'

const route = useRoute()
const router = useRouter()

const title = () => String(route.meta.title || '该模块')
</script>

<template>
  <div class="page">
    <EmptyState
      icon="layers"
      :title="title() + ' 建设中'"
      desc="该模块将在下一里程碑实现，当前为占位页面。"
      action-text="返回概览"
      @action="router.push('/')"
    />
  </div>
</template>