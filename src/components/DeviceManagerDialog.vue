<script setup lang="ts">
import { profileAddress, profileName } from "../lib/device-profiles";
import { activeDevice, connected, forgetDevice, openConnectionDialog, state } from "../lib/speaker";
import AppIcon from "./AppIcon.vue";

let pendingEditor: { id?: string } | null = null;
function edit(id?: string) {
  pendingEditor = { id };
  state.deviceManagerDialog = false;
}
function closed() {
  state.deviceManagerDialog = false;
  const editor = pendingEditor;
  pendingEditor = null;
  if (editor) openConnectionDialog(editor.id);
}
</script>

<template>
  <md-dialog
    id="device-manager-dialog"
    :open="state.deviceManagerDialog"
    @closed="closed"
    aria-label="管理设备"
  >
    <div slot="headline">管理设备</div>
    <div slot="content" class="dialog-content">
      <p class="hint">设备名称和地址仅保存在此浏览器，不会修改音箱本身。</p>
      <div v-if="!state.devices.length" class="hint">还没有保存的音箱。</div>
      <ul class="managed-devices">
        <li v-for="device in state.devices" :key="device.id">
          <span class="managed-icon"><AppIcon name="speaker" :size="22" /></span>
          <div>
            <strong>{{ profileName(device) }}</strong
            ><span class="hint">{{ profileAddress(device) }}</span
            ><span v-if="connected && activeDevice?.id === device.id" class="managed-connected"
              >当前连接</span
            >
          </div>
          <md-icon-button :aria-label="`编辑 ${profileName(device)}`" @click="edit(device.id)"
            ><AppIcon name="edit" :size="20" /></md-icon-button
          ><md-icon-button
            :aria-label="`移除 ${profileName(device)}`"
            @click="forgetDevice(device.id)"
            ><AppIcon name="trash" :size="20"
          /></md-icon-button>
        </li>
      </ul>
    </div>
    <div slot="actions">
      <md-text-button @click="state.deviceManagerDialog = false">关闭</md-text-button
      ><md-filled-tonal-button @click="edit()"
        ><AppIcon slot="icon" name="plus" :size="18" />添加音箱</md-filled-tonal-button
      >
    </div>
  </md-dialog>
</template>

<style scoped>
#device-manager-dialog {
  min-width: min(560px, calc(100vw - 24px));
  max-width: calc(100vw - 24px);
  max-height: calc(100dvh - 24px);
}
.managed-devices {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.managed-devices li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}
.managed-devices li:last-child {
  border: 0;
}
.managed-icon {
  flex-shrink: 0;
  color: var(--muted);
  padding-right: 4px;
}
.managed-devices li > div {
  display: grid;
  gap: 4px;
  min-width: 0;
  flex: 1;
  overflow-wrap: anywhere;
}
.managed-devices strong {
  font: var(--type-label-large);
}
.managed-connected {
  color: var(--success);
  font: var(--type-body-small);
}
.managed-devices md-icon-button {
  flex-shrink: 0;
}
</style>
