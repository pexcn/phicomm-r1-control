<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { array, flag, object } from "../lib/protocol";
import { connected, requestDevice, state } from "../lib/speaker";
import AppIcon from "./AppIcon.vue";

const enabled = ref(false);
const time = ref("03:00");
const confirmed = ref<{ enabled: boolean; time: string } | null>(null);
const busy = ref(false);
const error = ref("");
const status = ref("");
let generation = 0;
const supported = computed(() => connected.value && (state.version ?? 0) >= 1848);
const dirty = computed(
  () =>
    confirmed.value &&
    (enabled.value !== confirmed.value.enabled || time.value !== confirmed.value.time),
);

async function read() {
  const reply = await requestDevice({ type: "Auto_restart_device" });
  const data = object(reply.data);
  const times = array(data.Auto_restart_device_time);
  if (
    data.Auto_restart_device_open === undefined ||
    times.length !== 2 ||
    !times.every(Number.isInteger) ||
    Number(times[0]) < 0 ||
    Number(times[0]) > 23 ||
    Number(times[1]) < 0 ||
    Number(times[1]) > 59
  )
    throw new Error("设备未返回有效的自动重启配置。");
  return {
    enabled: flag(data.Auto_restart_device_open),
    time: times.map((value) => String(value).padStart(2, "0")).join(":"),
  };
}
async function refresh() {
  const current = ++generation;
  confirmed.value = null;
  error.value = "";
  status.value = "";
  if (!supported.value) {
    busy.value = false;
    return;
  }
  busy.value = true;
  try {
    const value = await read();
    if (current !== generation) return;
    confirmed.value = value;
    enabled.value = value.enabled;
    time.value = value.time;
  } catch (cause) {
    if (current === generation) error.value = (cause as Error).message;
  } finally {
    if (current === generation) busy.value = false;
  }
}
async function write(type: string, values: Record<string, unknown>) {
  const reply = await requestDevice({ type, ...values });
  if (!flag(object(reply.data)[type])) throw new Error("设备未确认设置，请重新读取后重试。");
}
async function save() {
  if (!confirmed.value || !supported.value || busy.value) return;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time.value)) {
    error.value = "请输入有效的每日重启时间。";
    return;
  }
  const current = ++generation;
  const target = { enabled: enabled.value, time: time.value };
  const session = state.session;
  const ensureCurrent = () => {
    if (current !== generation || session !== state.session || !connected.value)
      throw new Error("连接或页面已变更，请重新读取配置。");
  };
  const writeCurrent = async (type: string, values: Record<string, unknown>) => {
    ensureCurrent();
    await write(type, values);
    ensureCurrent();
  };
  const previous = confirmed.value;
  busy.value = true;
  error.value = "";
  status.value = "";
  try {
    if (!target.enabled && previous.enabled)
      await writeCurrent("set_Auto_restart_device_open", { open: false });
    if (target.time !== previous.time)
      await writeCurrent("set_Auto_restart_device_time", {
        times: JSON.stringify(target.time.split(":").map(Number)),
      });
    if (target.enabled && !previous.enabled)
      await writeCurrent("set_Auto_restart_device_open", { open: true });
    ensureCurrent();
    const value = await read();
    if (current !== generation) return;
    confirmed.value = value;
    if (value.enabled !== target.enabled || value.time !== target.time)
      throw new Error("设备回读与设置不一致，请重新读取后重试。");
    status.value = "已由音箱确认并保存。";
  } catch (cause) {
    if (current === generation) {
      error.value = (cause as Error).message;
      confirmed.value = null;
    }
  } finally {
    if (current === generation) busy.value = false;
  }
}
watch([connected, () => state.session, () => state.version], refresh, { immediate: true });
onBeforeUnmount(() => {
  ++generation;
});
</script>

<template>
  <article class="card auto-restart-card">
    <div class="section-heading">
      <h2>自动重启</h2>
      <AppIcon name="clock" />
    </div>
    <p class="hint">按音箱本地时间每日执行。配置保存在音箱，关闭网页后仍然生效。</p>
    <p v-if="!supported" class="hint">需要 EchoService 1.8.48 及以上，等待设备确认版本。</p>
    <div class="restart-fields">
      <div class="service-row">
        <strong>每日自动重启</strong
        ><md-switch
          aria-label="每日自动重启"
          :selected="enabled"
          :disabled="busy || !confirmed || !supported"
          @change="enabled = ($event.target as HTMLElement & { selected: boolean }).selected"
        />
      </div>
      <md-outlined-text-field
        label="每日重启时间"
        type="time"
        :value="time"
        :disabled="busy || !confirmed || !supported"
        @input="time = ($event.target as HTMLInputElement).value"
      />
    </div>
    <p v-if="error" class="notice error" role="alert">{{ error }}</p>
    <p v-if="status" class="hint" role="status">{{ status }}</p>
    <div class="card-footer">
      <md-text-button :disabled="busy || !supported" @click="refresh">重新读取</md-text-button
      ><md-filled-tonal-button :disabled="busy || !dirty || !supported" @click="save">{{
        busy ? "正在读取或保存…" : "保存自动重启"
      }}</md-filled-tonal-button>
    </div>
  </article>
</template>

<style scoped>
.auto-restart-card {
  display: grid;
  gap: 16px;
}
.restart-fields {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}
.restart-fields .service-row {
  flex: 1;
  min-width: 180px;
  padding: 0;
}
.restart-fields md-outlined-text-field {
  width: 180px;
  max-width: 100%;
}
@media (max-width: 500px) {
  .restart-fields md-outlined-text-field {
    width: 100%;
  }
}
</style>
