<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { connected, notify, requestDevice, send, state } from "../lib/speaker";
import {
  localPath,
  parseLocalMusic,
  playLocalPath,
  scanLocalMusic,
  supportsLocalMusic,
} from "../lib/local-music";

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();
const path = ref("/sdcard/Music");
const filter = ref("");
const files = ref<string[]>([]);
const busy = ref(false);
const error = ref("");
const scanned = ref(false);
const truncated = ref(false);
let generation = 0;
const playable = computed(
  () => connected.value && supportsLocalMusic(state.version, state.info.Current_PlayerType),
);
const filtered = computed(() =>
  files.value.filter((file) => file.toLowerCase().includes(filter.value.trim().toLowerCase())),
);
function invalidate() {
  ++generation;
  busy.value = false;
}
watch(
  () => props.open,
  (open) => {
    if (!open) invalidate();
  },
);
watch(
  () => state.session,
  () => {
    invalidate();
    files.value = [];
    scanned.value = false;
    error.value = "";
    path.value = "/sdcard/Music";
  },
);
onBeforeUnmount(invalidate);
async function scan() {
  const current = ++generation;
  busy.value = true;
  error.value = "";
  scanned.value = false;
  files.value = [];
  try {
    const directory = localPath(path.value);
    const reply = await requestDevice(scanLocalMusic(directory), 20000);
    if (current !== generation) return;
    const result = parseLocalMusic(reply.data, directory);
    files.value = result.files;
    truncated.value = result.truncated;
    scanned.value = true;
  } catch (cause) {
    if (current === generation) error.value = (cause as Error).message;
  } finally {
    if (current === generation) busy.value = false;
  }
}
function play(value: string) {
  if (!playable.value) return;
  try {
    if (send(playLocalPath(value))) {
      notify("已发送本地音乐播放指令，音频格式支持以设备为准。");
      send({ type: "list" });
    }
  } catch (cause) {
    error.value = (cause as Error).message;
  }
}
</script>

<template>
  <md-dialog
    id="local-music-dialog"
    :open="open"
    @closed="emit('close')"
    aria-label="本地音乐"
    class="local-music-dialog"
  >
    <div slot="headline">本地音乐</div>
    <div slot="content" class="dialog-content">
      <p class="hint">扫描音箱存储中的音频文件，不会上传文件或自动开始播放。</p>
      <md-outlined-text-field
        label="音乐目录或文件路径"
        :value="path"
        @input="path = ($event.target as HTMLInputElement).value"
        @keydown.enter.prevent="scan"
      />
      <div class="local-actions">
        <md-filled-tonal-button :disabled="!connected || busy" @click="scan">{{
          busy ? "正在扫描…" : "扫描目录"
        }}</md-filled-tonal-button>
        <md-outlined-button :disabled="!playable || busy" @click="play(path)"
          >播放路径</md-outlined-button
        >
      </div>
      <p v-if="!playable" class="hint">
        本地播放需 EchoService 1.8.56 及以上；1.8.56–1.8.64 需使用 MediaPlayer。
      </p>
      <p v-if="error" class="notice error" role="alert">{{ error }}</p>
      <md-outlined-text-field
        label="搜索本地音乐"
        :value="filter"
        @input="filter = ($event.target as HTMLInputElement).value"
      />
      <p class="hint" role="status">
        {{
          busy
            ? "正在读取目录…"
            : scanned
              ? `找到 ${files.length} 个音频文件，当前显示 ${filtered.length} 个`
              : "填写目录后点击扫描。目录下的子目录也会扫描。"
        }}
      </p>
      <p v-if="truncated && scanned" class="hint">本次仅检查前 2000 个文件，可缩小目录后重试。</p>
      <ul class="simple-list local-file-list">
        <li v-for="file in filtered" :key="file">
          <div class="track-text">
            <strong>{{ file.split("/").at(-1) }}</strong
            ><small :title="file">{{ file }}</small>
          </div>
          <md-text-button :disabled="!playable" :aria-label="`播放本地 ${file}`" @click="play(file)"
            >播放</md-text-button
          >
        </li>
      </ul>
    </div>
    <div slot="actions"><md-text-button @click="emit('close')">关闭</md-text-button></div>
  </md-dialog>
</template>

<style scoped>
.local-music-dialog {
  width: min(680px, calc(100vw - 24px));
}
.local-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.local-file-list {
  min-width: 0;
}
.local-file-list li {
  min-width: 0;
}
.local-file-list md-text-button {
  flex: none;
}
</style>
