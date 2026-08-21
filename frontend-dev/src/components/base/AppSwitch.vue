<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: boolean
    disabled?: boolean
  }>(),
  { disabled: false },
)

const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()

function toggle() {
  if (props.disabled) return
  emit('update:modelValue', !props.modelValue)
}
</script>

<template>
  <button
    type="button"
    class="switch"
    :class="{ on: modelValue, off: !modelValue }"
    :disabled="disabled"
    role="switch"
    :aria-checked="modelValue"
    @click="toggle"
  >
    <span class="switch__thumb" />
  </button>
</template>

<style scoped>
.switch {
  position: relative;
  width: 44px;
  height: 26px;
  border-radius: var(--r-pill);
  background: var(--border-strong);
  transition: background var(--dur) var(--ease);
  flex: 0 0 auto;
  padding: 0;
}
.switch__thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fff;
  box-shadow: var(--sh-1);
  transition: transform 0.22s var(--ease-out);
}
.switch.on {
  background: var(--brand);
}
.switch.on .switch__thumb {
  transform: translateX(18px);
}
.switch:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>