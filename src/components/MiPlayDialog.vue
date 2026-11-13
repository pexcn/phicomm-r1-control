<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { connected, requestDevice, state } from "../lib/speaker";
import { miPlayDiag, miPlayIp, miPlayValue, miPlayWrite, type MiPlaySetting } from "../lib/miplay";
import { type Data } from "../lib/protocol";
import MaterialState from "./MaterialState.vue";

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();
const target = ref("local");
const ip = ref("");
const diag = ref<Data | null>(null);
const busy = ref(false);
const error = ref("");
const status = ref("");
const readTime = ref("");
const queue = ref("");
const delay = ref("");
let generation = 0;
const supported = computed(() => connected.value && state.info.miplay_open != null);
const channel = computed(() => miPlayValue(diag.value, "channel"));
function has(key: MiPlaySetting) {
  return miPlayValue(diag.value, key) !== null;
}
function destination() {
  return target.value === "remote" ? miPlayIp(ip.value) : "";
}
function invalidate() {
  ++generation;
  diag.value = null;
  busy.value = false;
  error.value = "";
  status.value = "";
  readTime.value = "";
  queue.value = "";
  delay.value = "";
}
async function read(ip: string) {
  return miPlayDiag(
    await requestDevice(ip ? { type: "Get_MiPlay_Remote_Diag", ip } : { type: "Get_MiPlay_Diag" }),
    !!ip,
  );
}
function apply(value: Data) {
  diag.value = value;
  queue.value = has("queue_target_ms") ? String(value.queue_target_ms) : "";
  delay.value = has("sync_delay_ms") ? String(value.sync_delay_ms) : "";
  readTime.value = new Date().toLocaleTimeString();
}
async function query() {
  if (!supported.value || !props.open || busy.value) return;
  const current = ++generation;
  busy.value = true;
  error.value = "";
  status.value = "";
  diag.value = null;
  try {
    const value = await read(destination());
    if (current === generation) apply(value);
  } catch (cause) {
    if (current === generation) error.value = (cause as Error).message;
  } finally {
    if (current === generation) busy.value = false;
  }
}
async function save(key: MiPlaySetting, input: string | number) {
  if (busy.value || !supported.value || !diag.value || !has(key)) return;
  const current = ++generation;
  const session = state.session;
  const valid = () =>
    current === generation && session === state.session && props.open && supported.value;
  busy.value = true;
  error.value = "";
  status.value = "";
  try {
    if (String(input).trim() === "") throw new Error("请输入整数毫秒值。");
    const value = Number(input);
    const ip = destination();
    await requestDevice(miPlayWrite(key, value, ip));
    if (!valid()) return;
    const result = await read(ip);
    if (!valid()) return;
    apply(result);
    if (!has(key) || Number(result[key]) !== value)
      throw new Error("目标音箱回读未确认设置，请重新读取后核对。");
    status.value = "已由目标音箱回读确认并保存。";
  } catch (cause) {
    if (valid()) {
      error.value = (cause as Error).message;
      diag.value = null;
    }
  } finally {
    if (current === generation) busy.value = false;
  }
}
watch([() => props.open, () => state.session, supported, target, ip], () => {
  invalidate();
  if (props.open && supported.value && target.value === "local") void query();
});
onBeforeUnmount(invalidate);
const fields = [
  ["running", "运行中"],
  ["miplay_state", "投放状态"],
  ["mode", "运行模式"],
  ["channel", "声道（0 立体声 / 1 左 / 2 右）"],
  ["queue_target_ms", "队列目标（ms）"],
  ["sync_delay_ms", "同步延迟（ms）"],
  ["buffered_ms", "缓冲（ms）"],
  ["diag_valid", "诊断有效"],
  ["diag_age_ms", "诊断数据年龄（ms）"],
];
</script>

<template>
  <md-dialog id="miplay-dialog" :open="open" aria-label="MiPlay 控制与诊断" @closed="emit('close')">
    <div slot="headline">MiPlay 控制与诊断</div>
    <div slot="content" class="dialog-content miplay-content">
      <p class="hint">
        设置通过当前音箱发送，独立于 Unisound。远端音箱需在同一局域网并支持对应接口。
      </p>
      <p v-if="!supported" class="notice">当前音箱未上报 MiPlay 支持。</p>
      <md-outlined-select
        id="miplay-target"
        label="控制目标"
        :value="target"
        @change="target = ($event.target as HTMLElement & { value: string }).value"
      >
        <md-select-option value="local"><div slot="headline">当前音箱</div></md-select-option>
        <md-select-option value="remote"><div slot="headline">远端音箱</div></md-select-option>
      </md-outlined-select>
      <md-outlined-text-field
        v-if="target === 'remote'"
        id="miplay-ip"
        label="远端 IPv4 地址"
        :value="ip"
        @input="ip = ($event.target as HTMLInputElement).value"
      />
      <md-outlined-button :disabled="busy || !supported" @click="query"
        >重新读取诊断</md-outlined-button
      >
      <p v-if="error" class="notice error" role="alert">{{ error }}</p>
      <p v-if="status" class="hint" role="status">{{ status }}</p>
      <p v-if="busy" class="hint" role="status">正在等待目标音箱…</p>
      <template v-if="diag">
        <div>
          <h3>输出声道</h3>
          <div class="segmented">
            <button
              v-for="(label, mode) in ['立体声', '左声道', '右声道']"
              :key="mode"
              :aria-pressed="channel === mode"
              :disabled="busy || channel === null || channel === mode"
              @click="save('channel', mode)"
            >
              <MaterialState />{{ label }}
            </button>
          </div>
        </div>
        <h3>延迟参数</h3>
        <p class="hint">
          运行中生效并保存。正值晚播，负值早播；0 ms 为基准。队列目标越大，缓冲与延迟通常越大。
        </p>
        <div class="miplay-setting">
          <md-outlined-text-field
            id="miplay-delay"
            label="同步延迟（ms）"
            type="number"
            min="-500"
            max="500"
            step="1"
            :value="delay"
            :disabled="busy || !has('sync_delay_ms')"
            @input="delay = ($event.target as HTMLInputElement).value"
          /><md-text-button
            :disabled="busy || !has('sync_delay_ms')"
            @click="save('sync_delay_ms', delay)"
            >保存同步延迟</md-text-button
          >
        </div>
        <div class="miplay-setting">
          <md-outlined-text-field
            id="miplay-queue"
            label="队列目标（ms）"
            type="number"
            min="400"
            max="1500"
            step="1"
            :value="queue"
            :disabled="busy || !has('queue_target_ms')"
            @input="queue = ($event.target as HTMLInputElement).value"
          /><md-text-button
            :disabled="busy || !has('queue_target_ms')"
            @click="save('queue_target_ms', queue)"
            >保存队列目标</md-text-button
          >
        </div>
        <p v-if="!has('sync_delay_ms')" class="hint">目标固件未回报同步延迟，暂不可调整。</p>
        <h3>诊断快照</h3>
        <p class="hint">
          读取于 {{ readTime }}，不会自动刷新。诊断反映传输状态，不能证明实际出声同步。
        </p>
        <dl class="data-list">
          <template v-for="[key, label] in fields" :key="key"
            ><div v-if="diag[key] !== undefined">
              <dt>{{ label }}</dt>
              <dd>{{ diag[key] }}</dd>
            </div></template
          >
        </dl>
        <details>
          <summary>完整诊断数据</summary>
          <pre>{{ JSON.stringify(diag, null, 2) }}</pre>
        </details>
      </template>
    </div>
    <div slot="actions"><md-text-button @click="emit('close')">关闭</md-text-button></div>
  </md-dialog>
</template>

<style scoped>
.miplay-content {
  display: grid;
  gap: 16px;
  min-width: 0;
}
.miplay-content h3,
.miplay-content p {
  margin: 0;
}
.miplay-setting {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.miplay-setting md-outlined-text-field {
  flex: 1;
  min-width: 0;
}
.segmented {
  margin-top: 12px;
}
pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-size: 12px;
}
</style>
