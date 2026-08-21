<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    hint?: string
    error?: string
    required?: boolean
  }>(),
  { required: false },
)
</script>

<template>
  <label class="field">
    <span class="field__label">
      {{ label }}
      <em v-if="required" class="field__req">*</em>
    </span>
    <div class="field__control">
      <slot />
    </div>
    <span v-if="error" class="field__msg field__msg--error">{{ error }}</span>
    <span v-else-if="hint" class="field__msg">{{ hint }}</span>
  </label>
</template>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.field__label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-mid);
}
.field__req {
  color: var(--danger);
  font-style: normal;
  margin-left: 2px;
}
.field__control {
  display: flex;
  align-items: center;
  gap: 8px;
}
.field__msg {
  font-size: 12px;
  color: var(--text-faint);
}
.field__msg--error {
  color: var(--danger);
}
</style>