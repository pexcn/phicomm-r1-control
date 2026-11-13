<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { action, flag, numeric } from "../lib/protocol";
import { connected, send, state } from "../lib/speaker";

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();
const enabled = computed(() => flag(state.info.music_light_enable));
const available = computed(
  () =>
    connected.value &&
    state.version !== null &&
    state.version >= 1600 &&
    state.info.music_light_enable !== undefined,
);
const mode = computed(() => numeric(state.info.music_light_mode));
const modes = computed(() => [
  { value: 0, name: "官方效果" },
  { value: 2, name: "七彩效果" },
  ...(state.version !== null && state.version >= 1829
    ? [
        { value: 1, name: "七彩旋转" },
        { value: 3, name: "七彩旋转 1" },
      ]
    : []),
  ...(state.version !== null && state.version >= 1848 ? [{ value: 4, name: "单色效果" }] : []),
]);
const colorAllowed = computed(
  () => mode.value === 4 || (mode.value === 2 && (state.version ?? 0) >= 1881),
);
const color = ref("#ffffff");
const error = ref("");
watch(
  () => state.info.music_light_color,
  (value) => {
    const number = numeric(value, -1);
    if (Number.isInteger(number) && number >= 0 && number <= 0xffffff)
      color.value = "#" + number.toString(16).padStart(6, "0");
  },
  { immediate: true },
);
watch(
  () => props.open,
  (open) => {
    if (open) {
      error.value = "";
      send({ type: "get_info" });
    }
  },
);
watch(
  () => state.session,
  () => {
    color.value = "#ffffff";
    error.value = "";
  },
);
function change(arg: number, value: number) {
  if (!available.value) return;
  if (send(action(4, arg, value))) send({ type: "get_info" });
}
function toggle(event: Event) {
  const control = event.target as HTMLElement & { selected: boolean };
  const next = control.selected;
  control.selected = enabled.value;
  change(64, next ? 1 : 0);
}
function applyColor() {
  if (!/^#[0-9a-f]{6}$/i.test(color.value) || !colorAllowed.value) {
    error.value = "请输入 #RRGGBB 格式的灯光颜色。";
    return;
  }
  error.value = "";
  change(70, parseInt(color.value.slice(1), 16));
}
</script>

<template>
  <md-dialog id="atmosphere-light-dialog" :open="open" @closed="emit('close')" aria-label="氛围灯">
    <div slot="headline">氛围灯</div>
    <div slot="content" class="dialog-content">
      <div class="service-row">
        <div>
          <strong>启用氛围灯</strong>
          <p class="hint">开关状态以音箱回报为准。</p>
        </div>
        <md-switch
          aria-label="启用氛围灯"
          :disabled="!available"
          :selected="enabled"
          @change="toggle"
        />
      </div>
      <p v-if="!available" class="hint">正在等待设备的氛围灯状态；未上报时无法调整。</p>
      <md-outlined-select
        label="氛围效果"
        :value="String(mode)"
        :disabled="!available"
        @change="change(68, Number(($event.target as HTMLInputElement).value))"
      >
        <md-select-option v-for="option in modes" :key="option.value" :value="String(option.value)"
          ><div slot="headline">{{ option.name }}</div></md-select-option
        >
      </md-outlined-select>
      <div>
        <label>亮度 · {{ numeric(state.info.music_light_luma, 100) }}%</label
        ><md-slider
          aria-label="氛围灯亮度"
          :min="1"
          :max="200"
          :step="1"
          :value="numeric(state.info.music_light_luma, 100)"
          :disabled="!available || state.info.music_light_luma === undefined"
          @change="change(65, Number(($event.target as HTMLInputElement).value))"
        />
      </div>
      <div v-if="[0, 1, 3].includes(mode)">
        <label>颜色渐变速度 · {{ numeric(state.info.music_light_chroma, 4) }}</label
        ><md-slider
          aria-label="氛围灯渐变速度"
          :min="0"
          :max="100"
          :step="1"
          :value="numeric(state.info.music_light_chroma, 4)"
          :disabled="!available || state.info.music_light_chroma === undefined"
          @change="change(66, Number(($event.target as HTMLInputElement).value))"
        />
      </div>
      <div v-if="colorAllowed" class="light-color">
        <input type="color" aria-label="选择灯光颜色" v-model="color" :disabled="!available" />
        <md-outlined-text-field
          label="灯光颜色"
          :value="color"
          @input="color = ($event.target as HTMLInputElement).value"
          :disabled="!available"
          @keydown.enter.prevent="applyColor"
        />
        <md-outlined-button :disabled="!available" @click="applyColor">应用</md-outlined-button>
      </div>
      <p v-if="error" class="notice error" role="alert">{{ error }}</p>
    </div>
    <div slot="actions"><md-text-button @click="emit('close')">关闭</md-text-button></div>
  </md-dialog>
</template>

<style scoped>
md-slider {
  width: 100%;
}
.light-color {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.light-color input {
  width: 48px;
  height: 48px;
  flex: none;
  padding: 4px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 8px;
}
.light-color md-outlined-text-field {
  flex: 1;
  min-width: 120px;
}
</style>
