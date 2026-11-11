<script setup lang="ts">
import MaterialState from "./MaterialState.vue";
import { computed, watch, ref } from "vue";
import { musicApi, state } from "../lib/speaker";
import { save } from "../lib/storage";
import AppIcon from "./AppIcon.vue";
import { themeOrigin, themes, useTheme } from "../lib/theme";
import { colorSchemes } from "../lib/color-schemes";

const { mode, isDark, isTransitioning, colorScheme, setMode, setColorScheme } = useTheme();
const api = ref(state.musicApi);
const validationError = ref("");
const apiStatus = ref("");
const apiChanged = computed(() => api.value.trim() !== state.musicApi);
watch(
  () => state.settingsDialog,
  (open) => {
    if (open) {
      api.value = state.musicApi;
      validationError.value = "";
      apiStatus.value = "";
    }
  },
);
function updateApi(event: Event) {
  api.value = (event.target as HTMLInputElement).value;
  validationError.value = "";
  apiStatus.value = "";
}
function saveApi() {
  validationError.value = "";
  apiStatus.value = "";
  const previous = state.musicApi;
  state.musicApi = api.value.trim();
  try {
    musicApi();
  } catch (error) {
    state.musicApi = previous;
    validationError.value = (error as Error).message;
    return;
  }
  apiStatus.value = save("music-api", state.musicApi)
    ? "音乐接口已保存。"
    : "浏览器无法保存设置，本次会话仍可使用。";
}
</script>

<template>
  <md-dialog
    id="settings-dialog"
    :open="state.settingsDialog"
    @closed="state.settingsDialog = false"
    aria-label="设置"
  >
    <div slot="headline" class="dialog-title"><AppIcon name="settings" />设置</div>
    <div slot="content" class="dialog-content">
      <div>
        <h3>明暗模式</h3>
        <div class="segmented" aria-label="外观模式">
          <button
            v-for="option in themes"
            :key="option.id"
            :aria-pressed="mode === option.id"
            :disabled="isTransitioning"
            @click="setMode(option.id, themeOrigin($event))"
          >
            <MaterialState />
            {{ option.label }}
          </button>
        </div>
        <h3 id="theme-color-title" class="color-scheme-title">主题颜色</h3>
        <div class="color-schemes" role="radiogroup" aria-labelledby="theme-color-title">
          <label v-for="scheme in colorSchemes" :key="scheme.id" class="color-scheme-option">
            <input
              :id="`theme-color-${scheme.id}`"
              type="radio"
              name="theme-color"
              :value="scheme.id"
              :checked="colorScheme.id === scheme.id"
              :disabled="isTransitioning"
              @change="setColorScheme(scheme.id, themeOrigin($event))"
            />
            <span
              class="color-scheme-swatch"
              :style="{ backgroundColor: (isDark ? scheme.dark : scheme.light)['--accent'] }"
              aria-hidden="true"
            ></span>
            <span class="color-scheme-name">{{ scheme.label }}</span>
            <span class="color-scheme-check" aria-hidden="true"
              ><AppIcon name="check" :size="14"
            /></span>
            <md-ripple :for="`theme-color-${scheme.id}`" :disabled="isTransitioning" />
            <md-focus-ring :for="`theme-color-${scheme.id}`" />
          </label>
        </div>
        <p class="hint appearance-note">外观即时生效，自动保存在本浏览器。</p>
      </div>
      <md-outlined-text-field label="音乐接口地址" :value="api" @input="updateApi" />
      <p v-if="validationError" class="notice error" role="alert">{{ validationError }}</p>
      <div class="api-actions">
        <p v-if="apiStatus" class="hint" role="status">{{ apiStatus }}</p>
        <md-text-button :disabled="!apiChanged" @click="saveApi">保存接口</md-text-button>
      </div>
      <p class="hint">
        用于匿名搜歌、封面和歌词。可更换为兼容原作者 /music
        协议且允许跨域的服务；播放控制不依赖此接口。不提供音乐账号登录。
      </p>
      <p class="hint">设备地址、外观偏好与 EQ 仅保存在本浏览器。</p>
    </div>
    <div slot="actions">
      <md-filled-button @click="state.settingsDialog = false">完成</md-filled-button>
    </div>
  </md-dialog>
</template>

<style scoped>
#settings-dialog {
  min-width: min(560px, calc(100vw - 48px));
  max-width: min(600px, calc(100vw - 48px));
  max-height: calc(100dvh - 48px);
}
.color-scheme-title {
  margin-top: 24px;
}
.color-schemes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(132px, 100%), 1fr));
  gap: 12px;
  margin-top: 14px;
}
.color-scheme-option {
  position: relative;
  isolation: isolate;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 80px;
  padding: 16px;
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium);
  background: var(--md-sys-color-surface-container-lowest);
  cursor: pointer;
}
.color-scheme-option:has(input:checked) {
  padding: 15px;
  border: 2px solid var(--accent);
  background: var(--soft);
}
.color-scheme-option:has(input:disabled) {
  cursor: default;
}
.color-scheme-option input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  opacity: 0;
  cursor: inherit;
}
.color-scheme-swatch {
  flex: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1px #ffffff18;
}
.color-scheme-name {
  white-space: nowrap;
  font: var(--type-title-medium);
}
.color-scheme-check {
  display: grid;
  flex: none;
  place-items: center;
  width: 20px;
  height: 20px;
  margin-left: auto;
  border-radius: 50%;
  background: var(--accent);
  color: var(--on-accent);
  opacity: 0;
}
.color-scheme-option:has(input:checked) .color-scheme-check {
  opacity: 1;
}
.appearance-note {
  margin-top: 12px;
}
.api-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: -10px;
}
.api-actions .hint {
  margin-right: auto;
}
@media (max-width: 500px) {
  #settings-dialog {
    min-width: calc(100vw - 24px);
    max-width: calc(100vw - 24px);
    max-height: calc(100dvh - 24px);
  }
  .color-scheme-option {
    gap: 8px;
    min-height: 76px;
    padding: 12px;
  }
  .color-scheme-option:has(input:checked) {
    padding: 11px;
  }
  .color-scheme-swatch {
    width: 30px;
    height: 30px;
  }
  .color-scheme-name {
    font: var(--type-title-small);
  }
  .color-scheme-check {
    width: 18px;
    height: 18px;
  }
}
</style>
