<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { action, flag, object, type Data, type Message } from "../lib/protocol";
import {
  audioEffects,
  audioEffectMessage,
  dspQuery,
  mixerMessage,
  parseDspState,
  type AudioEffectId,
} from "../lib/audio-effects";
import { connected, requestDevice, send, state } from "../lib/speaker";
import AppIcon from "./AppIcon.vue";

const config = ref<Data>({});
const busy = ref(false);
const error = ref("");
const dsp = ref<ReturnType<typeof parseDspState>>(null);
const dspBusy = ref(false);
const dspError = ref("");
let epoch = 0;
let effectTimer: ReturnType<typeof setTimeout>;
let dspTimer: ReturnType<typeof setTimeout>;
const effects = computed(() =>
  audioEffects.map((effect) => {
    const data = object(config.value[effect.id]);
    const raw = data[effect.field];
    const value = raw === null || raw === "" ? NaN : Number(raw);
    return {
      ...effect,
      enabled: flag(data[effect.flag]),
      value,
      available:
        connected.value &&
        data[effect.flag] !== undefined &&
        Number.isFinite(value) &&
        value >= effect.min &&
        value <= effect.max,
    };
  }),
);
const mixer = computed(() => object(config.value.Mixer));
const channels = [
  { id: "L", label: "中低音分路" },
  { id: "R", label: "高音分路" },
] as const;
const mixerSupported = computed(() => connected.value && (state.version ?? 0) >= 1876);
function mixerValue(channel: "L" | "R") {
  return Number(mixer.value[`DAC Digital Volume ${channel}`]);
}
function mixerAvailable(channel: "L" | "R") {
  const value = mixerValue(channel);
  return mixerSupported.value && Number.isInteger(value) && value >= 211 && value <= 251;
}
async function readEffects() {
  const current = epoch;
  busy.value = true;
  error.value = "";
  try {
    const reply = await requestDevice({ type: "get_eq_config" });
    if (current === epoch) config.value = object(reply.data);
  } catch (cause) {
    if (current === epoch) {
      config.value = {};
      error.value = (cause as Error).message;
    }
  } finally {
    if (current === epoch) busy.value = false;
  }
}
async function readDsp() {
  const current = epoch;
  dspBusy.value = true;
  dspError.value = "";
  try {
    const reply = await requestDevice({ type: "shell", shell: dspQuery });
    if (current === epoch) dsp.value = parseDspState(reply.data);
  } catch (cause) {
    if (current === epoch) {
      dsp.value = null;
      dspError.value = (cause as Error).message;
    }
  } finally {
    if (current === epoch) dspBusy.value = false;
  }
}
function command(message: Message) {
  if (busy.value || !connected.value || !send(message)) return;
  busy.value = true;
  const current = epoch;
  clearTimeout(effectTimer);
  effectTimer = setTimeout(() => {
    if (current === epoch && connected.value) void readEffects();
  }, 400);
}
function tune(id: AudioEffectId, enabled: boolean | null, value = 0) {
  if (!effects.value.find((effect) => effect.id === id)?.available) return;
  try {
    command(audioEffectMessage(id, enabled, value));
  } catch (cause) {
    error.value = (cause as Error).message;
  }
}
function toggle(id: AudioEffectId, event: Event) {
  const control = event.target as HTMLElement & { selected: boolean };
  const next = control.selected;
  control.selected = effects.value.find((effect) => effect.id === id)?.enabled ?? false;
  tune(id, next);
}
function setMixer(channel: "L" | "R", value: number) {
  if (!mixerAvailable(channel)) return;
  try {
    command(mixerMessage(state.version, channel, value));
  } catch (cause) {
    error.value = (cause as Error).message;
  }
}
function toggleDsp(event: Event) {
  const control = event.target as HTMLElement & { selected: boolean };
  const next = control.selected;
  control.selected = dsp.value?.enabled ?? false;
  if (dspBusy.value || !dsp.value || !connected.value || state.version === null) return;
  const message =
    state.version >= 1869
      ? action(16384, 100, 0, next ? 1 : 0)
      : { type: "shell", shell: `setprop persist.route0feture ${next ? 1 : 0}` };
  if (!send(message)) return;
  dspBusy.value = true;
  const current = epoch;
  clearTimeout(dspTimer);
  dspTimer = setTimeout(() => {
    if (current === epoch && connected.value) void readDsp();
  }, 500);
}
function reset() {
  ++epoch;
  clearTimeout(effectTimer);
  clearTimeout(dspTimer);
  config.value = {};
  dsp.value = null;
  busy.value = false;
  dspBusy.value = false;
  error.value = "";
  dspError.value = "";
  if (connected.value) {
    void readEffects();
    void readDsp();
  }
}
watch([connected, () => state.session], reset, { immediate: true });
onBeforeUnmount(() => {
  ++epoch;
  clearTimeout(effectTimer);
  clearTimeout(dspTimer);
});
</script>

<template>
  <div class="advanced-audio">
    <article v-for="effect in effects" :key="effect.id" class="card effect-card">
      <div class="section-heading">
        <h2>{{ effect.label }}</h2>
        <md-switch
          :aria-label="`启用${effect.label}`"
          :selected="effect.enabled"
          :disabled="busy || !effect.available"
          @change="toggle(effect.id, $event)"
        />
      </div>
      <p v-if="!effect.available" class="hint">设备未提供此音效配置。</p>
      <template v-else
        ><label
          >{{ effect.valueLabel }} ·
          {{ (effect.value / effect.divisor).toFixed(effect.id === "loudness" ? 1 : 0) }}
          {{ effect.unit }}</label
        >
        <md-slider
          :aria-label="effect.valueLabel"
          :min="effect.min"
          :max="effect.max"
          :step="effect.step"
          :value="effect.value"
          :disabled="busy || !effect.enabled"
          @change="tune(effect.id, null, Number(($event.target as HTMLInputElement).value))"
        />
      </template>
    </article>
    <article class="card effect-card dsp-card">
      <div class="section-heading">
        <h2>DSP 低音增强</h2>
        <md-switch
          aria-label="启用 DSP 低音增强"
          :selected="dsp?.enabled ?? false"
          :disabled="dspBusy || !dsp || state.version === null"
          @change="toggleDsp"
        />
      </div>
      <p class="hint" role="status">
        {{
          dspBusy
            ? "正在读取 DSP 状态…"
            : !dsp
              ? "设备未提供可用的 DSP 状态。"
              : dsp.active === true
                ? "DSP 固件报告增强生效中。"
                : dsp.active === false
                  ? "DSP 固件尚未报告增强生效。"
                  : "已读取开关状态，固件生效状态未知。"
        }}
      </p>
      <p v-if="dspError" class="notice error" role="alert">{{ dspError }}</p>
      <md-text-button :disabled="dspBusy || !connected" @click="readDsp"
        >重新读取 DSP</md-text-button
      >
    </article>
    <article class="card effect-card mixer-card">
      <div class="section-heading">
        <h2>扬声器分路音量</h2>
        <AppIcon name="volume" />
      </div>
      <p v-if="!mixerSupported" class="hint">需要 EchoService 1.8.76 及以上。</p>
      <div v-for="channel in channels" :key="channel.id">
        <label
          >{{ channel.label }} ·
          {{ mixerAvailable(channel.id) ? `${mixerValue(channel.id) - 231} dB` : "未上报" }}</label
        >
        <md-slider
          :aria-label="channel.label"
          :min="211"
          :max="251"
          :step="1"
          :value="mixerAvailable(channel.id) ? mixerValue(channel.id) : 231"
          :disabled="busy || !mixerAvailable(channel.id)"
          @change="setMixer(channel.id, Number(($event.target as HTMLInputElement).value))"
        />
      </div>
      <p class="hint">相对参考值 231 显示。分路增益独立于播放音量，数值以设备回读为准。</p>
    </article>
    <div class="effect-footer">
      <p v-if="error" class="notice error" role="alert">{{ error }}</p>
      <md-text-button :disabled="busy || !connected" @click="readEffects"
        >重新读取高级音效</md-text-button
      >
    </div>
  </div>
</template>

<style scoped>
.advanced-audio {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}
.effect-card {
  display: grid;
  align-content: start;
  gap: 16px;
}
.effect-card .section-heading {
  margin-bottom: 0;
}
.effect-card md-slider {
  width: 100%;
}
.effect-footer {
  grid-column: 1/-1;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}
.effect-footer .notice {
  flex: 1;
}
@media (max-width: 760px) {
  .advanced-audio {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }
}
</style>
