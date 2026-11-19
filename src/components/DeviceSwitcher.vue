<script setup lang="ts">
import AppDialog from "./AppDialog.vue";
import { computed, onBeforeUnmount, ref, watch } from "vue";
import AppIcon from "./AppIcon.vue";
import MaterialState from "./MaterialState.vue";
import { profileAddress, profileName, type DeviceProfile } from "../lib/device-profiles";
import {
  activeDevice,
  connected,
  connectDevice,
  connectionLabel,
  deviceName,
  disconnect,
  openConnectionDialog,
  state,
} from "../lib/speaker";

const media = window.matchMedia("(max-width: 760px)");
const mobile = ref(media.matches);
let afterClose: (() => void) | undefined;
let drag: {
  id: number;
  start: number;
  distance: number;
  handle: HTMLElement;
  surface: HTMLElement;
} | null = null;
let ignoreHandleClick = false;
function resetDrag() {
  const current = drag;
  drag = null;
  if (!current) return;
  current.surface.removeAttribute("data-sheet-dragging");
  current.surface.style.removeProperty("--app-sheet-offset");
  if (current.handle.hasPointerCapture(current.id))
    current.handle.releasePointerCapture(current.id);
}
function dragStart(event: PointerEvent) {
  if (!event.isPrimary || event.button !== 0) return;
  const handle = event.currentTarget as HTMLElement;
  const surface = handle.closest("md-dialog");
  if (!surface) return;
  for (const element of surface.shadowRoot?.querySelectorAll("*") ?? []) {
    for (const animation of element.getAnimations()) animation.finish();
  }
  ignoreHandleClick = false;
  drag = { id: event.pointerId, start: event.clientY, distance: 0, handle, surface };
  surface.setAttribute("data-sheet-dragging", "");
  handle.setPointerCapture(event.pointerId);
}
function dragMove(event: PointerEvent) {
  if (!drag || event.pointerId !== drag.id) return;
  event.preventDefault();
  drag.distance = Math.max(0, event.clientY - drag.start);
  drag.surface.style.setProperty("--app-sheet-offset", `${drag.distance}px`);
}
function dragEnd(event: PointerEvent) {
  if (!drag || event.pointerId !== drag.id) return;
  ignoreHandleClick = drag.distance > 6;
  if (drag.distance >= 80) {
    // Keep the dragged offset until the close animation has sampled it.
    drag.surface.removeAttribute("data-sheet-dragging");
    state.devicePickerOpen = false;
  } else resetDrag();
}
window.addEventListener("blur", resetDrag);
function handleClick(event: MouseEvent) {
  if (event.detail === 0 || !ignoreHandleClick) state.devicePickerOpen = false;
  ignoreHandleClick = false;
}
function mediaChanged() {
  resetDrag();
  afterClose = undefined;
  state.devicePickerOpen = false;
  mobile.value = media.matches;
}
media.addEventListener("change", mediaChanged);
onBeforeUnmount(() => {
  window.removeEventListener("blur", resetDrag);
  resetDrag();
  afterClose = undefined;
  media.removeEventListener("change", mediaChanged);
  state.devicePickerOpen = false;
});
const label = computed(() =>
  connected.value
    ? activeDevice.value?.name || deviceName.value
    : state.status === "disconnected"
      ? "连接音箱"
      : connectionLabel.value,
);
function toggle() {
  if (!state.devices.length) openConnectionDialog();
  else state.devicePickerOpen = !state.devicePickerOpen;
}
function current(device: DeviceProfile) {
  return connected.value && device.address === state.address;
}
function status(device: DeviceProfile) {
  return device.address === state.address && state.status !== "disconnected"
    ? connectionLabel.value
    : "已保存";
}
function run(action: () => void) {
  afterClose = action;
  state.devicePickerOpen = false;
}
function closed(event: Event) {
  const surface = event.currentTarget as HTMLElement & { open: boolean };
  if (!surface.isConnected || surface.open) return;
  state.devicePickerOpen = false;
  resetDrag();
  ignoreHandleClick = false;
  const action = afterClose;
  afterClose = undefined;
  action?.();
}
function escape(event: KeyboardEvent) {
  if (!state.devicePickerOpen || event.key !== "Escape") return;
  event.preventDefault();
  event.stopPropagation();
  state.devicePickerOpen = false;
}
function add() {
  run(() => openConnectionDialog());
}
function manage() {
  run(() => (state.deviceManagerDialog = true));
}
watch(
  () => state.devices.length,
  (count) => {
    if (!count) state.devicePickerOpen = false;
  },
);
</script>

<template>
  <div class="device-switcher" @keydown="escape">
    <button
      id="device-switcher-anchor"
      class="connection-chip"
      :class="{ online: connected }"
      @click="toggle"
      aria-label="选择或连接音箱"
      :aria-haspopup="state.devices.length ? (mobile ? 'dialog' : 'menu') : 'dialog'"
      :aria-expanded="state.devicePickerOpen"
      :aria-controls="
        state.devices.length ? (mobile ? 'device-sheet' : 'device-menu') : 'connection-dialog'
      "
    >
      <MaterialState /><span class="status-dot"></span
      ><span class="connection-label">{{ label }}</span>
      <AppIcon
        v-if="state.devices.length"
        :name="state.devicePickerOpen ? 'up' : 'down'"
        :size="16"
      />
    </button>
    <md-menu
      v-if="!mobile"
      id="device-menu"
      :open="state.devicePickerOpen"
      anchor="device-switcher-anchor"
      positioning="popover"
      anchor-corner="end-end"
      menu-corner="start-end"
      :y-offset="8"
      @closing="state.devicePickerOpen = false"
      @closed="closed"
      aria-label="选择音箱"
    >
      <div class="picker-heading">
        <span>选择音箱</span><small>{{ state.devices.length }} 台已保存</small>
      </div>
      <md-menu-item
        v-for="device in state.devices"
        :key="device.id"
        class="picker-item"
        :class="{ 'current-device': current(device) }"
        :selected="current(device)"
        :typeahead-text="profileName(device)"
        @click="run(() => connectDevice(device.id))"
      >
        <span slot="start" class="picker-device-icon"><AppIcon name="speaker" :size="20" /></span>
        <div slot="headline" class="picker-name">{{ profileName(device) }}</div>
        <div slot="supporting-text" class="picker-address">
          {{ profileAddress(device) }} · {{ status(device) }}
        </div>
        <AppIcon v-if="current(device)" slot="end" class="picker-check" name="check" :size="20" />
      </md-menu-item>
      <div class="picker-divider" role="separator"></div>
      <md-menu-item class="picker-add" @click="add"
        ><AppIcon slot="start" name="plus" :size="20" />
        <div slot="headline">添加音箱</div></md-menu-item
      >
      <md-menu-item @click="manage"
        ><AppIcon slot="start" name="settings" :size="20" />
        <div slot="headline">管理设备</div></md-menu-item
      >
      <div class="picker-divider" role="separator"></div>
      <md-menu-item :disabled="state.status === 'disconnected'" @click="run(disconnect)"
        ><AppIcon slot="start" name="unlink" :size="20" />
        <div slot="headline">断开连接</div></md-menu-item
      >
    </md-menu>
    <AppDialog
      v-else
      id="device-sheet"
      mode="sheet"
      :open="state.devicePickerOpen"
      @closing="state.devicePickerOpen = false"
      @closed="closed"
      aria-label="选择音箱"
    >
      <template #headline
        ><div class="sheet-header">
          <button
            class="sheet-drag-handle"
            type="button"
            aria-label="点按或向下拖动关闭设备列表"
            @pointerdown="dragStart"
            @pointermove="dragMove"
            @pointerup="dragEnd"
            @pointercancel="resetDrag"
            @click="handleClick"
          >
            <span aria-hidden="true"></span><MaterialState />
          </button>
          <div class="sheet-heading">
            <span>选择音箱</span><small>{{ state.devices.length }} 台已保存</small
            ><md-icon-button aria-label="关闭设备列表" @click="state.devicePickerOpen = false"
              ><AppIcon name="close" :size="20"
            /></md-icon-button>
          </div></div
      ></template>
      <div slot="content" class="sheet-devices">
        <button
          v-for="device in state.devices"
          :key="device.id"
          class="sheet-device"
          :class="{ 'current-device': current(device) }"
          :aria-pressed="current(device)"
          @click="run(() => connectDevice(device.id))"
        >
          <MaterialState /><span class="picker-device-icon"
            ><AppIcon name="speaker" :size="20" /></span
          ><span class="sheet-device-text"
            ><span class="picker-name">{{ profileName(device) }}</span
            ><span class="picker-address"
              >{{ profileAddress(device) }} · {{ status(device) }}</span
            ></span
          ><AppIcon v-if="current(device)" class="picker-check" name="check" :size="20" />
        </button>
      </div>
      <div slot="actions" class="sheet-actions">
        <div>
          <md-filled-button @click="add"
            ><AppIcon slot="icon" name="plus" :size="18" />添加音箱</md-filled-button
          ><md-filled-tonal-button @click="manage">管理设备</md-filled-tonal-button>
        </div>
        <footer>
          <span class="hint">设备仅保存在此浏览器</span
          ><md-text-button :disabled="state.status === 'disconnected'" @click="run(disconnect)"
            >断开连接</md-text-button
          >
        </footer>
      </div>
    </AppDialog>
  </div>
</template>

<style scoped>
.device-switcher {
  position: relative;
  min-width: 0;
}
#device-menu {
  min-width: 320px;
  max-width: min(380px, calc(100vw - 24px));
  --md-menu-container-shape: 16px;
  --md-menu-container-color: var(--md-sys-color-surface-container);
}
.picker-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 20px;
  font: var(--type-label-large);
}
.picker-heading small,
.sheet-heading small {
  color: var(--muted);
  font: var(--type-body-small);
}
.picker-item {
  margin: 0 8px;
  border-radius: 12px;
  --md-menu-item-top-space: 12px;
  --md-menu-item-bottom-space: 12px;
}
.picker-device-icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--surface-high);
  color: var(--muted);
}
.current-device {
  background: var(--soft);
}
.current-device .picker-device-icon {
  color: var(--accent);
  background: var(--md-sys-color-primary-container);
}
.picker-check {
  flex-shrink: 0;
  color: var(--accent);
}
.picker-name {
  font: var(--type-label-large);
  overflow-wrap: anywhere;
}
.picker-address {
  color: var(--muted);
  font: var(--type-body-small);
  overflow-wrap: anywhere;
}
.picker-divider {
  margin: 8px 12px;
  height: 1px;
  background: var(--border);
}
.picker-add {
  --md-menu-item-label-text-color: var(--accent);
  --md-menu-item-leading-icon-color: var(--accent);
}
:global(#device-sheet) {
  margin: auto 0 0;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  max-height: calc(100dvh - 64px);
  --md-dialog-container-shape-end-start: 0;
  --md-dialog-container-shape-end-end: 0;
}
.sheet-heading {
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
  width: 100%;
  min-height: 48px;
  padding: 0 24px;
}
.sheet-heading small {
  margin-left: auto;
}
.sheet-header {
  width: 100%;
}
.sheet-drag-handle {
  display: grid;
  place-items: center;
  width: 100%;
  min-height: 48px;
  border: 0;
  border-radius: 28px 28px 0 0;
  background: transparent;
  touch-action: none;
  cursor: grab;
}
.sheet-drag-handle:active {
  cursor: grabbing;
}
.sheet-drag-handle > span {
  width: 32px;
  height: 4px;
  border-radius: 2px;
  background: var(--md-sys-color-on-surface-variant);
}
.sheet-devices {
  display: grid;
  gap: 4px;
}
.sheet-device {
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
  isolation: isolate;
  min-height: 72px;
  width: 100%;
  padding: 12px;
  border: 0;
  border-radius: 16px;
  color: var(--text);
  background: transparent;
  text-align: left;
}
.sheet-device.current-device {
  background: var(--soft);
}
.sheet-device-text {
  display: grid;
  gap: 4px;
  min-width: 0;
  flex: 1;
}
.sheet-actions {
  display: grid;
  gap: 8px;
  width: 100%;
  padding-bottom: env(safe-area-inset-bottom);
}
.sheet-actions > div {
  display: flex;
  gap: 12px;
}
.sheet-actions > div > * {
  flex: 1;
}
.sheet-actions footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
</style>
