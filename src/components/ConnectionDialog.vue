<script setup lang="ts">
import AppDialog from "./AppDialog.vue";
import { computed, ref, watch } from "vue";
import {
  activeDevice,
  connected,
  connectDevice,
  disconnect,
  connectionLabel,
  saveDevice,
  state,
} from "../lib/speaker";
import { endpoint } from "../lib/protocol";
import AppIcon from "./AppIcon.vue";

const address = ref(state.address);
const name = ref("");
const validationError = ref("");
const addressError = ref("");
const nameError = ref("");
watch(address, () => (addressError.value = ""));
watch(name, () => (nameError.value = ""));
const profile = computed(() =>
  state.devices.find((device) => device.id === state.connectionDeviceId),
);
const title = ref("连接音箱");
const error = computed(() => validationError.value || state.error);
const busy = computed(
  () =>
    !!state.connectionPendingAddress &&
    (state.status === "connecting" || state.status === "reconnecting"),
);
const requiresReconnect = computed(() => {
  try {
    return (
      state.status !== "disconnected" &&
      profile.value?.id === activeDevice.value?.id &&
      endpoint(address.value).href !== state.address
    );
  } catch {
    return false;
  }
});
watch(
  () => state.connectionDialog,
  (open) => {
    if (open) {
      title.value = profile.value ? "编辑音箱" : state.devices.length ? "添加音箱" : "连接音箱";
      address.value = profile.value?.address || "";
      name.value = profile.value?.name || "";
      validationError.value = "";
      addressError.value = "";
      nameError.value = "";
    }
  },
);
function submit(connectAfter = true) {
  if (busy.value || (!connectAfter && requiresReconnect.value)) return;
  validationError.value = "";
  addressError.value = "";
  nameError.value = "";
  let normalized: string;
  try {
    normalized = endpoint(address.value).href;
  } catch (cause) {
    addressError.value = (cause as Error).message;
    return;
  }
  if (name.value.trim().length > 40) {
    nameError.value = "设备名称不能超过 40 个字符。";
    return;
  }
  if (
    state.devices.some((device) => device.address === normalized && device.id !== profile.value?.id)
  ) {
    addressError.value = "该地址已保存在设备列表中，请直接选择或编辑已有设备。";
    return;
  }
  try {
    const device = saveDevice({ id: profile.value?.id, name: name.value, address: address.value });
    state.connectionDeviceId = device.id;
    if (!connectAfter) {
      state.connectionDialog = false;
      return;
    }
    state.connectionPendingAddress = device.address;
    connectDevice(device.id);
    if (connected.value && state.address === device.address) state.connectionDialog = false;
  } catch (cause) {
    validationError.value = (cause as Error).message;
  }
}
function closed() {
  state.connectionDialog = false;
  state.connectionPendingAddress = "";
}
</script>

<template>
  <AppDialog
    id="connection-dialog"
    :open="state.connectionDialog"
    @closed="closed"
    :aria-label="title"
  >
    <div slot="headline" class="dialog-title"><AppIcon name="speaker" />{{ title }}</div>
    <form id="connection-form" slot="content" class="dialog-content" @submit.prevent="submit()">
      <p class="muted">与音箱连接同一网络，填写设备地址即可开始。</p>
      <md-outlined-text-field
        label="设备名称（可选）"
        placeholder="例如：客厅音箱"
        :value="name"
        :error="!!nameError"
        :error-text="nameError"
        :disabled="busy"
        maxlength="40"
        @input="name = ($event.target as HTMLInputElement).value"
      />
      <md-outlined-text-field
        label="音箱地址"
        placeholder="192.168.1.40 或 wss://代理地址/"
        :value="address"
        :error="!!addressError"
        :error-text="addressError"
        :disabled="busy"
        @input="address = ($event.target as HTMLInputElement).value"
        @keydown.enter.prevent="submit()"
        autocomplete="off"
        spellcheck="false"
        required
      />
      <p class="hint">普通 IP 默认使用 8080 端口；完整 WebSocket 地址会保留端口、路径和参数。</p>
      <p class="hint">名称和地址仅保存在此浏览器。切换控制对象不会停止原音箱播放。</p>
      <p v-if="requiresReconnect" class="hint">修改当前地址后需要重新连接。</p>
      <div v-if="error" role="alert" class="notice error">{{ error }}</div>
      <details class="connection-help">
        <summary>HTTPS 下无法连接？</summary>
        <p>
          部分浏览器需允许本站访问本地网络。若浏览器不支持，可使用自己的 WSS 反向代理；GitHub Pages
          不提供设备代理，也不会为音箱添加 TLS。
        </p>
      </details>
    </form>
    <div slot="actions">
      <md-text-button
        v-if="busy"
        @click="
          disconnect();
          state.connectionPendingAddress = '';
        "
        >取消连接</md-text-button
      >
      <md-text-button @click="state.connectionDialog = false">{{
        busy ? "关闭" : "取消"
      }}</md-text-button>
      <md-text-button v-if="!requiresReconnect" :disabled="busy" @click="submit(false)"
        >保存</md-text-button
      >
      <md-filled-button @click="submit()" :disabled="busy">{{
        busy ? connectionLabel : requiresReconnect ? "保存并重新连接" : "连接"
      }}</md-filled-button>
    </div>
  </AppDialog>
</template>
