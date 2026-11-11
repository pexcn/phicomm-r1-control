<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import AppIcon from "../components/AppIcon.vue";
import EmptyState from "../components/EmptyState.vue";
import { action } from "../lib/protocol";
import { connected, key, notify, send, startScreen, state, stopScreen } from "../lib/speaker";

const inputText = ref("");
const speechText = ref("");
const image = ref<HTMLImageElement>();
const ratio = computed(() => `${state.screen.imageWidth} / ${state.screen.imageHeight}`);
let gesture: { x: number; y: number; time: number; session: number; pointer: number } | null = null;
watch(connected, (value) => {
  if (value) startScreen();
  else gesture = null;
});
watch(
  () => state.session,
  () => {
    gesture = null;
  },
);
onMounted(() => {
  startScreen();
  window.addEventListener("keydown", keyboard);
  document.addEventListener("visibilitychange", visibility);
});
onBeforeUnmount(() => {
  stopScreen();
  window.removeEventListener("keydown", keyboard);
  document.removeEventListener("visibilitychange", visibility);
});
function visibility() {
  if (document.hidden) stopScreen();
}
function keyboard(event: KeyboardEvent) {
  if (!connected.value || state.connectionDialog || state.settingsDialog) return;
  if (
    event
      .composedPath()
      .some(
        (node) =>
          node instanceof HTMLElement &&
          (node.matches('input,textarea,select,button,[contenteditable="true"]') ||
            node.tagName.startsWith("MD-")),
      )
  )
    return;
  const codes: Record<string, number> = {
    ArrowUp: 19,
    ArrowDown: 20,
    ArrowLeft: 21,
    ArrowRight: 22,
    Enter: 23,
    Escape: 4,
  };
  if (codes[event.key]) {
    event.preventDefault();
    key(codes[event.key]);
  }
}
function point(event: PointerEvent) {
  const bounds = image.value!.getBoundingClientRect();
  return {
    x: Math.max(
      0,
      Math.min(
        state.screen.width - 1,
        Math.round(((event.clientX - bounds.left) / bounds.width) * state.screen.width),
      ),
    ),
    y: Math.max(
      0,
      Math.min(
        state.screen.height - 1,
        Math.round(((event.clientY - bounds.top) / bounds.height) * state.screen.height),
      ),
    ),
  };
}
function imageLoaded() {
  if (!image.value?.naturalWidth || !image.value.naturalHeight) return;
  state.screen.imageWidth = image.value.naturalWidth;
  state.screen.imageHeight = image.value.naturalHeight;
  if (!state.screen.sizeConfirmed) {
    state.screen.width = state.screen.imageWidth;
    state.screen.height = state.screen.imageHeight;
  }
}
function down(event: PointerEvent) {
  if (!connected.value || !image.value || !event.isPrimary) return;
  const p = point(event);
  gesture = { ...p, time: Date.now(), session: state.session, pointer: event.pointerId };
  image.value.setPointerCapture(event.pointerId);
}
function up(event: PointerEvent) {
  const start = gesture;
  gesture = null;
  if (
    !start ||
    start.pointer !== event.pointerId ||
    start.session !== state.session ||
    !connected.value ||
    !image.value
  )
    return;
  const end = point(event);
  const duration = Math.max(80, Math.min(2000, Date.now() - start.time));
  const moved = Math.hypot(end.x - start.x, end.y - start.y) > 8;
  send({
    type: "input",
    input:
      moved || duration > 500
        ? `swipe ${start.x} ${start.y} ${end.x} ${end.y} ${duration}`
        : `tap ${start.x} ${start.y}`,
  });
}
function screenshot() {
  send({ type: "screencap" });
}
function download() {
  if (!state.screen.image) return;
  const a = document.createElement("a");
  a.href = state.screen.image;
  a.download = `r1-screen-${Date.now()}.jpg`;
  a.click();
}
function text() {
  const value = inputText.value.trim();
  if (!value) return;
  const quoted = "'" + value.replace(/ /g, "%s").replace(/'/g, "'\\''") + "'";
  if (send({ type: "input", input: `text ${quoted}` })) {
    inputText.value = "";
    notify("已发送文字，字符支持取决于设备输入法。");
  }
}
function speak() {
  const value = speechText.value.trim();
  if (value && send(action(65536, 0, 0, value))) {
    speechText.value = "";
    notify("已发送语音播报指令。");
  }
}
function quality(event: Event) {
  state.screen.interval = Number((event.target as HTMLSelectElement).value);
  if (state.screen.active) {
    stopScreen();
    startScreen();
  }
}
</script>

<template>
  <section class="page screen-page">
    <div class="page-heading">
      <div>
        <p class="eyebrow">触手可及</p>
        <h1>屏幕</h1>
        <p class="muted">
          {{ connected ? "点击、滑动，就像操作音箱本身。" : "将音箱屏幕，放在手边。" }}
        </p>
      </div>
      <span v-if="connected && state.screen.active" class="status-badge"
        ><span class="status-dot"></span>实时 · {{ state.screen.fps }} FPS</span
      >
    </div>
    <EmptyState
      v-if="!connected"
      icon="screen"
      description="连接后查看实时画面，直接点击或滑动操作音箱。"
    />
    <template v-else
      ><div class="screen-layout">
        <div class="screen-column">
          <div class="device-frame">
            <div class="device-display" :style="{ aspectRatio: ratio }">
              <img
                v-if="state.screen.image"
                ref="image"
                :src="state.screen.image"
                alt="音箱实时屏幕，可点击与滑动"
                draggable="false"
                @load="imageLoaded"
                @pointerdown.prevent="down"
                @pointerup.prevent="up"
                @pointercancel="gesture = null"
              />
              <div v-else class="screen-placeholder">
                <AppIcon name="screen" :size="42" />
                <p>{{ state.screen.active ? "正在等待音箱画面…" : "屏幕已暂停" }}</p>
                <md-text-button @click="screenshot">获取截图</md-text-button>
              </div>
            </div>
            <nav class="device-navigation" aria-label="音箱系统导航">
              <button @click="key(4)" aria-label="音箱返回">
                <AppIcon name="back" /><span>返回</span></button
              ><button @click="key(3)" aria-label="音箱 Home">
                <AppIcon name="home" /><span>Home</span></button
              ><button @click="key(82)" aria-label="音箱菜单">
                <AppIcon name="menu" /><span>菜单</span>
              </button>
            </nav>
          </div>
          <div class="screen-toolbar">
            <md-filled-tonal-button @click="state.screen.active ? stopScreen() : startScreen()"
              ><AppIcon slot="icon" :name="state.screen.active ? 'pause' : 'play'" :size="18" />{{
                state.screen.active ? "暂停推流" : "开始推流"
              }}</md-filled-tonal-button
            ><md-outlined-button @click="screenshot"
              ><AppIcon slot="icon" name="camera" :size="18" />截图</md-outlined-button
            ><md-icon-button
              aria-label="下载当前截图"
              :disabled="!state.screen.image"
              @click="download"
              ><AppIcon name="download" /></md-icon-button
            ><select aria-label="推流帧率" :value="state.screen.interval" @change="quality">
              <option :value="1000">省流 · 1 FPS</option>
              <option :value="333">均衡 · 3 FPS</option>
              <option :value="100">流畅 · 10 FPS</option>
            </select>
          </div>
          <p class="hint screen-hint">
            {{ state.screen.width }} × {{ state.screen.height }} ·
            保持设备原始比例；切换页面或隐藏网页时停止推流。
          </p>
        </div>
        <div class="screen-tools">
          <article class="card remote-card">
            <div class="section-heading">
              <h2>遥控</h2>
              <AppIcon name="phone" />
            </div>
            <div class="remote-body">
              <div class="direction-pad">
                <button class="direction up" @click="key(19)" aria-label="音箱向上">
                  <AppIcon name="up" /></button
                ><button class="direction left" @click="key(21)" aria-label="音箱向左">
                  <AppIcon name="left" /></button
                ><button class="direction center" @click="key(23)">确定</button
                ><button class="direction right" @click="key(22)" aria-label="音箱向右">
                  <AppIcon name="right" /></button
                ><button class="direction down" @click="key(20)" aria-label="音箱向下">
                  <AppIcon name="down" />
                </button>
              </div>
              <div class="volume-keys">
                <md-icon-button aria-label="音箱音量加" @click="key(24)"
                  ><AppIcon name="plus" /></md-icon-button
                ><AppIcon name="volume" :size="20" /><md-icon-button
                  aria-label="音箱音量减"
                  @click="key(25)"
                  ><span class="minus-sign">−</span></md-icon-button
                >
              </div>
            </div>
          </article>
          <article class="card">
            <div class="section-heading">
              <h2>文字与语音</h2>
              <AppIcon name="mic" />
            </div>
            <form class="text-input-row" @submit.prevent="text">
              <md-outlined-text-field
                label="发送文字到设备"
                :value="inputText"
                @input="inputText = ($event.target as HTMLInputElement).value"
                @keydown.enter.prevent="text"
              /><md-icon-button :disabled="!inputText.trim()" aria-label="发送文字" @click="text"
                ><AppIcon name="send"
              /></md-icon-button>
            </form>
            <form class="text-input-row" @submit.prevent="speak">
              <md-outlined-text-field
                label="让音箱读一段文字"
                :value="speechText"
                @input="speechText = ($event.target as HTMLInputElement).value"
                @keydown.enter.prevent="speak"
              /><md-icon-button :disabled="!speechText.trim()" aria-label="语音播报" @click="speak"
                ><AppIcon name="mic"
              /></md-icon-button>
            </form>
            <p class="hint">语音播报需设备语音服务支持。</p>
          </article>
        </div>
      </div></template
    >
  </section>
</template>
