<script setup lang="ts">
import MaterialState from "./MaterialState.vue";
import { watch, ref } from "vue";
import { musicApi, notify, state } from "../lib/speaker";
import { save } from "../lib/storage";
import AppIcon from "./AppIcon.vue";

const api = ref(state.musicApi);
const validationError = ref("");
watch(
  () => state.settingsDialog,
  (open) => {
    if (open) {
      api.value = state.musicApi;
      validationError.value = "";
    }
  },
);
function saveSettings() {
  validationError.value = "";
  const previous = state.musicApi;
  state.musicApi = api.value.trim();
  try {
    musicApi();
  } catch (error) {
    state.musicApi = previous;
    validationError.value = (error as Error).message;
    return;
  }
  if (!save("music-api", state.musicApi)) notify("浏览器无法保存设置，本次会话仍可使用。");
  state.settingsDialog = false;
}
function theme(value: string) {
  state.theme = value;
  save("theme", value);
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
        <h3>外观</h3>
        <div class="segmented" aria-label="外观模式">
          <button
            v-for="option in [
              { id: 'light', label: '浅色' },
              { id: 'dark', label: '深色' },
              { id: 'system', label: '跟随系统' },
            ]"
            :key="option.id"
            :aria-pressed="state.theme === option.id"
            @click="theme(option.id)"
          >
            <MaterialState />
            {{ option.label }}
          </button>
        </div>
      </div>
      <md-outlined-text-field
        label="音乐接口地址"
        :value="api"
        @input="api = ($event.target as HTMLInputElement).value"
      />
      <p v-if="validationError" class="notice error" role="alert">{{ validationError }}</p>
      <p class="hint">
        用于匿名搜歌、封面和歌词。可更换为兼容原作者 /music
        协议且允许跨域的服务；播放控制不依赖此接口。不提供音乐账号登录。
      </p>
      <p class="hint">设备地址、主题与 EQ 仅保存在本浏览器，与原作者版分别存储。</p>
    </div>
    <div slot="actions">
      <md-text-button @click="state.settingsDialog = false">取消</md-text-button
      ><md-filled-button @click="saveSettings">保存</md-filled-button>
    </div>
  </md-dialog>
</template>
