<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { connect, connectionLabel, state } from "../lib/speaker";
import AppIcon from "./AppIcon.vue";

const address = ref(state.address);
const error = computed(() => state.error);
const busy = computed(() => state.status === "connecting" || state.status === "reconnecting");
watch(
  () => state.connectionDialog,
  (open) => {
    if (open) address.value = state.address;
  },
);
function submit() {
  connect(address.value);
}
</script>

<template>
  <md-dialog
    id="connection-dialog"
    :open="state.connectionDialog"
    @closed="state.connectionDialog = false"
    aria-label="连接音箱"
  >
    <div slot="headline" class="dialog-title"><AppIcon name="speaker" />连接音箱</div>
    <form id="connection-form" slot="content" class="dialog-content" @submit.prevent="submit">
      <p class="muted">与音箱连接同一网络，填写设备地址即可开始。</p>
      <md-outlined-text-field
        label="音箱地址"
        placeholder="192.168.1.40 或 wss://代理地址/"
        :value="address"
        @input="address = ($event.target as HTMLInputElement).value"
        @keydown.enter.prevent="submit"
        autocomplete="off"
        spellcheck="false"
        required
      />
      <p class="hint">普通 IP 默认使用 8080 端口；完整 WebSocket 地址会保留端口、路径和参数。</p>
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
      <md-text-button @click="state.connectionDialog = false">取消</md-text-button>
      <md-filled-button @click="submit" :disabled="busy">{{
        busy ? connectionLabel : "连接"
      }}</md-filled-button>
    </div>
  </md-dialog>
</template>
