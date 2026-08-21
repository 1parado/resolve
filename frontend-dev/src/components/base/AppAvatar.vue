<script setup lang="ts">
import { computed } from 'vue'
import { identicon, initialsOf } from '@/utils/format'

const props = withDefaults(
  defineProps<{
    name: string
    src?: string
    size?: number
    color?: string
    status?: 'online' | 'offline' | 'busy' | ''
    square?: boolean
  }>(),
  { size: 40, status: '', square: false },
)

const imgSrc = computed(() => props.src || identicon(props.name || '匿名', props.size * 3))
const initials = computed(() => initialsOf(props.name || '匿名'))
const boxStyle = computed(() => ({ width: props.size + 'px', height: props.size + 'px' }))
</script>

<template>
  <span class="avatar" :class="[{ 'avatar--square': square }, status ? 'avatar--' + status : '']" :style="boxStyle">
    <img v-if="imgSrc" :src="imgSrc" :alt="name" class="avatar__img" :style="boxStyle" />
    <span v-else class="avatar__initials" :style="{ background: color || 'var(--brand)' }">{{ initials }}</span>
    <i v-if="status" class="avatar__dot" />
  </span>
</template>

<style scoped>
.avatar {
  position: relative;
  display: inline-flex;
  flex: 0 0 auto;
  border-radius: 50%;
  overflow: visible;
  line-height: 0;
}
.avatar--square { border-radius: 22%; }
.avatar__img {
  border-radius: inherit;
  object-fit: cover;
  display: block;
}
.avatar__initials {
  width: 100%;
  height: 100%;
  border-radius: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 0.36em;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.avatar__dot {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 26%;
  height: 26%;
  min-width: 9px;
  min-height: 9px;
  border-radius: 50%;
  border: 2px solid #fff;
  background: var(--text-faint);
}
.avatar--online .avatar__dot { background: var(--success); }
.avatar--busy .avatar__dot { background: var(--warn); }
</style>