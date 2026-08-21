<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    type?: string
    placeholder?: string
    invalid?: boolean
    disabled?: boolean
    maxlength?: number
  }>(),
  { type: 'text', invalid: false, disabled: false },
)

const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()
const el = ref<HTMLInputElement>()

function onInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLInputElement).value)
}

defineExpose({
  focus: () => el.value?.focus(),
})
</script>

<template>
  <input
    ref="el"
    :type="type"
    :value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :maxlength="maxlength"
    :class="{ invalid }"
    class="input"
    @input="onInput"
  />
</template>

<style scoped>
.input {
  width: 100%;
  height: 40px;
  padding: 0 14px;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  font-size: 13.5px;
  color: var(--text-strong);
  outline: none;
  transition: border-color var(--dur) var(--ease), box-shadow var(--dur) var(--ease);
}
.input::placeholder { color: var(--text-faint); }
.input:focus {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px var(--brand-soft);
}
.input.invalid {
  border-color: var(--danger);
}
.input.invalid:focus {
  box-shadow: 0 0 0 3px var(--danger-soft);
}
.input:disabled {
  background: var(--surface-soft);
  color: var(--text-faint);
  cursor: not-allowed;
}
</style>