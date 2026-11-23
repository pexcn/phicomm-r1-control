<script setup lang="ts">
import { computed, ref, watch } from "vue";
import AppDialog from "./AppDialog.vue";

const props = withDefaults(
  defineProps<{
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    divisor?: number;
    offset?: number;
    unit: string;
    disabled?: boolean;
  }>(),
  { step: 1, divisor: 1, offset: 0 },
);
const emit = defineEmits<{ apply: [value: number] }>();
const mounted = ref(false);
const open = ref(false);
const draft = ref("");
const error = ref("");
const title = computed(() => `调整${props.label}`);
const displayValue = computed(() => (props.value - props.offset) / props.divisor);
const minimum = computed(() => (props.min - props.offset) / props.divisor);
const maximum = computed(() => (props.max - props.offset) / props.divisor);
const stepSize = computed(() => props.step / props.divisor);

function edit() {
  if (props.disabled) return;
  draft.value = String(displayValue.value);
  error.value = "";
  mounted.value = true;
  open.value = true;
}
function update(event: Event) {
  draft.value = (event.target as HTMLInputElement).value;
  error.value = "";
}
function apply() {
  if (props.disabled || !open.value) return;
  const raw = Number(draft.value) * props.divisor + props.offset;
  const value = Math.round(raw);
  if (!draft.value.trim() || !Number.isFinite(value) || value < props.min || value > props.max) {
    error.value = `请输入 ${minimum.value} 到 ${maximum.value} ${props.unit} 之间的数值。`;
    return;
  }
  if (Math.abs(raw - value) > 1e-6 || (value - props.min) % props.step !== 0) {
    error.value = `请按 ${stepSize.value} ${props.unit} 的步长输入。`;
    return;
  }
  open.value = false;
  if (value !== props.value) emit("apply", value);
}
function closed() {
  open.value = false;
  mounted.value = false;
}
watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) open.value = false;
  },
);
</script>

<template>
  <md-text-button
    class="gain-value"
    :aria-label="`${title}，当前 ${displayValue} ${unit}`"
    :disabled="disabled"
    aria-haspopup="dialog"
    @click="edit"
    ><slot
  /></md-text-button>
  <AppDialog v-if="mounted" :open="open" :aria-label="title" @closed="closed">
    <template #headline>{{ title }}</template>
    <div slot="content" class="dialog-content">
      <md-outlined-text-field
        :label="`数值（${unit}）`"
        type="number"
        :value="draft"
        :min="String(minimum)"
        :max="String(maximum)"
        :step="String(stepSize)"
        :error="!!error"
        :error-text="error"
        autofocus
        @input="update"
        @keydown.enter.prevent="apply"
      />
      <p class="hint">
        范围 {{ minimum }} 到 {{ maximum }} {{ unit }}，每档 {{ stepSize }} {{ unit }}。
      </p>
    </div>
    <div slot="actions">
      <md-text-button @click="open = false">取消</md-text-button>
      <md-filled-button @click="apply">应用</md-filled-button>
    </div>
  </AppDialog>
</template>

<style scoped>
.gain-value {
  justify-self: start;
  flex: none;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  --md-text-button-leading-space: 8px;
  --md-text-button-trailing-space: 8px;
}
</style>
