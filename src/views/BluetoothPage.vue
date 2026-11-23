<script setup lang="ts">
import { useConfirmation } from "../lib/confirmation";
import { computed, onBeforeUnmount, ref, watch } from "vue";
import AppIcon from "../components/AppIcon.vue";
import EmptyState from "../components/EmptyState.vue";
import { connected, notify, requestDevice, send, state } from "../lib/speaker";
import { array, flag, object, type Data } from "../lib/protocol";

const confirmAction = useConfirmation();
const scanState = ref<"idle" | "starting" | "scanning" | "finished">("idle");
const scanResults = ref<Data[]>([]);
const scanError = ref("");
const searching = computed(() => ["starting", "scanning"].includes(scanState.value));
let generation = 0;
let readingGeneration: number | null = null;
let active = true;
function clearSearch() {
  ++generation;
  scanState.value = "idle";
  scanResults.value = [];
  scanError.value = "";
}
const seen = computed(() =>
  scanResults.value.filter(
    (row, index, list) =>
      !state.bluetooth.bonded.some((item) => item.Address === row.Address) &&
      list.findIndex((item) => item.Address === row.Address) === index,
  ),
);
async function readBluetooth() {
  if (
    !active ||
    !connected.value ||
    scanState.value === "starting" ||
    readingGeneration === generation
  )
    return;
  const current = generation;
  const collectResults = scanState.value === "scanning";
  readingGeneration = current;
  try {
    const reply = await requestDevice({ type: "BT_Device" }, 5000);
    if (!active || current !== generation) return;
    scanError.value = "";
    // Only a fresh read after this search's acknowledgement can supply its results.
    if (collectResults) {
      const data = object(reply.data);
      if (data.Scanning == null) throw new Error("音箱未返回搜索状态，正在重试读取。");
      scanResults.value = array(data.Scan_Devices).map(object);
      if (!flag(data.Scanning)) scanState.value = "finished";
    }
  } catch (cause) {
    if (active && current === generation) scanError.value = (cause as Error).message;
  } finally {
    if (readingGeneration === current) readingGeneration = null;
  }
}
async function search() {
  if (!connected.value || !state.bluetooth.enabled || state.bluetooth.scanning || searching.value)
    return;
  clearSearch();
  const current = generation;
  scanState.value = "starting";
  try {
    const reply = await requestDevice({ type: "BT_StartScan" }, 5000);
    if (!active || current !== generation) return;
    if (!flag(reply.data)) throw new Error("音箱未能启动搜索，请稍后重试。");
    scanState.value = "scanning";
    await readBluetooth();
  } catch (cause) {
    if (active && current === generation) {
      scanState.value = "idle";
      scanError.value = (cause as Error).message;
    }
  }
}
watch([() => state.session, connected, () => state.bluetooth.enabled], clearSearch, {
  flush: "sync",
});
const poll = setInterval(() => {
  void readBluetooth();
}, 2500);
onBeforeUnmount(() => {
  active = false;
  clearSearch();
  clearInterval(poll);
});
function enable(event: Event) {
  const control = event.target as HTMLElement & { selected: boolean };
  const next = control.selected;
  control.selected = state.bluetooth.enabled;
  send({ type: next ? "BT_enable" : "BT_disable" });
}
function isConnected(row: Data) {
  const address = String(row.Address);
  return state.bluetooth.outputs.includes(address) || state.bluetooth.inputs.includes(address);
}
function command(type: string, row: Data) {
  if (send({ type, mac: String(row.Address) })) {
    notify("已发送指令，等待设备确认。");
  }
}
async function remove(row: Data) {
  const session = state.session;
  const address = row.Address;
  if (
    (await confirmAction({
      title: "取消蓝牙配对？",
      message: `取消与“${String(row.Name || address)}”的配对？`,
      action: "取消配对",
      danger: true,
    })) &&
    session === state.session &&
    connected.value &&
    state.bluetooth.bonded.some((device) => device.Address === address)
  )
    command("BT_removeBond", row);
}
</script>

<template>
  <section class="page bluetooth-page">
    <div class="page-heading">
      <div>
        <p class="eyebrow">无线，也自在</p>
        <h1>蓝牙</h1>
        <p class="muted">连接手机，或让声音传到另一台设备。</p>
      </div>
      <md-outlined-button v-if="connected" @click="readBluetooth"
        ><AppIcon slot="icon" name="refresh" :size="18" />刷新</md-outlined-button
      >
    </div>
    <EmptyState v-if="!connected" icon="bluetooth" />
    <template v-else
      ><article class="card bluetooth-hero">
        <span class="feature-icon"><AppIcon name="bluetooth" :size="32" /></span>
        <div>
          <h2>蓝牙适配器</h2>
          <p class="muted">
            {{
              !state.bluetooth.available
                ? "等待设备状态…"
                : state.bluetooth.enabled
                  ? "已开启，可连接蓝牙设备"
                  : "已关闭"
            }}
          </p>
        </div>
        <md-switch
          :disabled="!state.bluetooth.available"
          :selected="state.bluetooth.enabled"
          @change="enable"
          aria-label="开启蓝牙"
        />
      </article>
      <div v-if="state.bluetooth.enabled" class="bluetooth-grid">
        <article class="card">
          <div class="section-heading">
            <h2>已配对设备</h2>
            <span class="muted">{{ state.bluetooth.bonded.length }} 台</span>
          </div>
          <div v-if="!state.bluetooth.bonded.length" class="small-empty">
            <AppIcon name="bluetooth" :size="36" />
            <p>还没有配对的设备</p>
            <p class="hint">开启搜索，或在手机蓝牙设置中连接音箱。</p>
          </div>
          <ul class="bluetooth-list">
            <li v-for="row in state.bluetooth.bonded" :key="String(row.Address)">
              <div class="bluetooth-device-title">
                <span class="feature-icon small"><AppIcon name="bluetooth" /></span>
                <div class="track-text">
                  <strong>{{ row.Name || "蓝牙设备" }}</strong
                  ><small>{{ row.Address }}</small>
                </div>
                <span v-if="isConnected(row)" class="status-badge">已连接</span>
              </div>
              <div class="bluetooth-actions">
                <template v-if="isConnected(row)"
                  ><md-text-button
                    v-if="state.bluetooth.outputs.includes(String(row.Address))"
                    @click="command('BT_Disconnect_A2dp_Device', row)"
                    >断开输出</md-text-button
                  ><md-text-button
                    v-if="state.bluetooth.inputs.includes(String(row.Address))"
                    @click="command('BT_Disconnect_A2dpSink_Device', row)"
                    >断开输入</md-text-button
                  ></template
                ><template v-else
                  ><md-text-button @click="command('BT_Connect_A2dpSink_Device', row)"
                    >作为音频输入</md-text-button
                  ><md-text-button @click="command('BT_Connect_A2dp_Device', row)"
                    >作为音频输出</md-text-button
                  ></template
                ><md-icon-button
                  :aria-label="`取消配对 ${row.Name || row.Address}`"
                  @click="remove(row)"
                  ><AppIcon name="trash" :size="18"
                /></md-icon-button>
              </div>
            </li>
          </ul>
          <p class="hint">手机通常作为输入；蓝牙耳机或其他音箱作为输出。实际连接能力取决于设备。</p>
        </article>
        <article class="card">
          <div class="section-heading">
            <h2>附近设备</h2>
            <md-filled-tonal-button
              :disabled="state.bluetooth.scanning || searching"
              @click="search"
              ><AppIcon slot="icon" name="search" :size="18" />{{
                searching || state.bluetooth.scanning ? "正在搜索" : "搜索设备"
              }}</md-filled-tonal-button
            >
          </div>
          <p class="hint" role="status">
            {{
              scanState === "finished"
                ? "搜索已结束 · 结果仅保留在本次页面，设备不一定仍在附近。"
                : scanState === "starting"
                  ? "正在请求音箱开始搜索…"
                  : scanState === "scanning"
                    ? scanError
                      ? "搜索状态暂未确认，正在重试读取。"
                      : "正在发现附近的设备…"
                    : state.bluetooth.scanning
                      ? "音箱正在搜索，完成后可重新搜索本轮设备。"
                      : "点击“搜索设备”查看本轮发现的设备。"
            }}
          </p>
          <p v-if="scanError" class="notice error" role="alert">{{ scanError }}</p>
          <div v-if="!seen.length" class="small-empty">
            <AppIcon name="search" :size="36" />
            <p>{{ scanState === "finished" ? "本轮未发现可配对设备" : "发现更多连接" }}</p>
            <p class="hint">请让目标设备进入蓝牙配对模式。</p>
          </div>
          <ul class="simple-list">
            <li v-for="row in seen" :key="String(row.Address)">
              <div class="track-text">
                <strong>{{ row.Name || "蓝牙设备" }}</strong
                ><small>{{ row.Address }}</small>
              </div>
              <md-text-button
                :aria-label="`配对 ${row.Name ? `${row.Name} · ` : ''}${row.Address}`"
                @click="command('BT_createBond', row)"
                >配对</md-text-button
              >
            </li>
          </ul>
        </article>
      </div>
      <div v-else-if="state.bluetooth.available" class="card small-empty">
        <p>开启蓝牙后管理配对与连接。</p>
      </div></template
    >
  </section>
</template>
