<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { MdSlider } from "@material/web/slider/slider.js";
import { sliderBounds } from "../lib/slider-values";

defineOptions({ inheritAttrs: false });
const props = withDefaults(
  defineProps<{
    value: number;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    variant?: "standard" | "compact" | "progress";
    formatValue?: (value: number) => string;
  }>(),
  { min: 0, max: 100, step: 1, disabled: false, variant: "standard", formatValue: String },
);
const emit = defineEmits<{ input: [event: Event]; change: [event: Event] }>();
const slider = ref<MdSlider>();
const draft = ref(props.value);
const active = ref(false);
const below = ref(false);
const label = computed(() => props.formatValue(draft.value));
let pointer: number | null = null;
let cancelled = false;
let disposed = false;
let observer: ResizeObserver | undefined;
let placement = 0;
const adjustmentKeys = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "PageUp",
  "PageDown",
]);

async function placeLabel() {
  const current = ++placement;
  await nextTick();
  const control = slider.value;
  if (!control || !active.value || disposed) return;
  await control.updateComplete;
  if (current !== placement || disposed || !active.value) return;
  const indicator = control.shadowRoot?.querySelector<HTMLElement>(".label");
  const handle = control.shadowRoot?.querySelector<HTMLElement>(".handle.end");
  if (!indicator || !handle) return;
  const bounds = sliderBounds(control);
  const rect = handle.getBoundingClientRect();
  const center = rect.left + rect.width / 2;
  const half = indicator.offsetWidth / 2;
  const target = Math.max(bounds.left + half, Math.min(bounds.right - half, center));
  control.style.setProperty("--app-slider-label-shift", `${target - center}px`);
  below.value =
    rect.top - indicator.offsetHeight - 12 < bounds.top &&
    bounds.bottom - rect.bottom >= indicator.offsetHeight + 12;
}
function startPointer(event: PointerEvent) {
  if (props.disabled || !event.isPrimary || event.button !== 0) return;
  pointer = event.pointerId;
  cancelled = false;
  active.value = true;
  void placeLabel();
}
function stopPointer(event: PointerEvent) {
  if (event.pointerId !== pointer) return;
  if (event.type === "pointercancel") cancel();
  else {
    pointer = null;
    active.value = false;
  }
}
function cancel() {
  cancelled = active.value || pointer !== null;
  ++placement;
  pointer = null;
  active.value = false;
  draft.value = props.value;
}
function input(event: Event) {
  if (props.disabled) return;
  draft.value = Number((event.target as MdSlider).value);
  void placeLabel();
  emit("input", event);
}
function change(event: Event) {
  if (props.disabled || cancelled) return;
  draft.value = Number((event.target as MdSlider).value);
  emit("change", event);
}
function keydown(event: KeyboardEvent) {
  if (props.disabled || !adjustmentKeys.has(event.key)) return;
  cancelled = false;
  active.value = true;
  void placeLabel();
}
function keyup(event: KeyboardEvent) {
  if (adjustmentKeys.has(event.key)) active.value = false;
}
watch(
  () => props.value,
  (value) => {
    if (!active.value) draft.value = value;
  },
);
watch(() => [props.min, props.max, props.step, props.disabled], cancel);
onMounted(() => {
  window.addEventListener("pointerup", stopPointer, true);
  window.addEventListener("pointercancel", stopPointer, true);
  window.addEventListener("blur", cancel);
  window.addEventListener("scroll", placeLabel, true);
  observer = new ResizeObserver(() => {
    if (active.value) void placeLabel();
  });
  if (slider.value) observer.observe(slider.value);
});
onBeforeUnmount(() => {
  disposed = true;
  ++placement;
  observer?.disconnect();
  window.removeEventListener("pointerup", stopPointer, true);
  window.removeEventListener("pointercancel", stopPointer, true);
  window.removeEventListener("blur", cancel);
  window.removeEventListener("scroll", placeLabel, true);
});
</script>

<template>
  <md-slider
    ref="slider"
    v-bind="$attrs"
    class="app-slider"
    :class="`slider-${variant}`"
    :min="min"
    :max="max"
    :step="step"
    :value="draft"
    :disabled="disabled"
    labeled
    :value-label="label"
    :aria-valuetext="label"
    :data-active="active ? '' : undefined"
    :data-below="below ? '' : undefined"
    @pointerdown.capture="startPointer"
    @input="input"
    @change="change"
    @keydown="keydown"
    @keyup="keyup"
    @focusout="active = false"
  />
</template>
