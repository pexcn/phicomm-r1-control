<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { action, flag, numeric, object } from "../lib/protocol";
import { audioDetails } from "../lib/playback-settings";
import { connected, notify, requestDevice, send, state } from "../lib/speaker";

const sources = [
  { value: "qq", label: "QQ 音乐" },
  { value: "netease", label: "网易云音乐" },
  { value: "kuwo", label: "酷我音乐" },
];
const qualities = computed(() =>
  ["高品", "超品", "无损", "Hi-Res"].slice(0, flag(state.info.Support_Flac) ? 4 : 2),
);
const details = computed(() => audioDetails(state.info));
const engine = computed(() => numeric(state.info.Current_PlayerType));
const busy = ref(false);
const error = ref("");
const status = ref("");
let generation = 0;
watch(
  () => state.session,
  () => {
    ++generation;
    busy.value = false;
    error.value = "";
    status.value = "";
  },
);
onBeforeUnmount(() => {
  ++generation;
});

async function change(event: Event, setting: "source" | "engine" | "quality") {
  const control = event.target as HTMLElement & { value: string };
  const target = control.value;
  const key = { source: "music_source", engine: "PlayerType", quality: "ExoPlayer_Quality" }[
    setting
  ];
  control.value = String(state.info[key] ?? "");
  if (busy.value || !connected.value) return;
  if (
    setting === "source" &&
    (!flag(state.info.Unisound) || !sources.some((s) => s.value === target))
  )
    return;
  if (setting === "engine" && ((state.version ?? 0) < 1856 || !["1", "2"].includes(target))) return;
  if (
    setting === "quality" &&
    ((state.version ?? 0) < 1863 ||
      engine.value !== 2 ||
      !/^[0-3]$/.test(target) ||
      !qualities.value[Number(target)])
  )
    return;
  const session = state.session;
  if (
    setting === "engine" &&
    !confirm("切换播放引擎需要重启 EchoService，将中断播放与连接。继续吗？")
  )
    return;
  if (session !== state.session || !connected.value) return;
  const current = ++generation;
  const valid = () => current === generation && session === state.session && connected.value;
  busy.value = true;
  error.value = "";
  status.value = "";
  try {
    const reply = await requestDevice(
      setting === "source"
        ? action(65536, 0, 4, target)
        : {
            type: setting === "engine" ? "switch_player" : "switch_quality",
            [setting === "engine" ? "player" : "quality"]: Number(target),
          },
    );
    if (!valid()) return;
    if (setting === "engine") {
      if (numeric(object(reply.data).player) !== Number(target))
        throw new Error("设备未确认播放引擎设置，未执行重启。");
      notify("播放引擎设置已确认，正在重启 EchoService；重连后请核对当前引擎。");
      send({ type: "reboot_echo" });
      status.value = "已请求重启 EchoService，等待重新连接。";
      return;
    }
    // A relay ACK only confirms delivery. Check the device preference itself.
    for (let attempt = 0; attempt < 4; attempt++) {
      if (attempt) await new Promise((resolve) => setTimeout(resolve, 350));
      if (!valid()) return;
      const info = object((await requestDevice({ type: "get_info" })).data);
      if (!valid()) return;
      if (String(info[key]) === target) {
        status.value = "已由音箱回读确认。";
        return;
      }
    }
    throw new Error("设备尚未回报目标设置，请刷新后核对；未将发送成功视为生效。");
  } catch (cause) {
    if (valid()) error.value = (cause as Error).message;
  } finally {
    if (current === generation) busy.value = false;
  }
}
</script>

<template>
  <article class="card playback-settings">
    <div class="section-heading">
      <h2>播放设置</h2>
      <span class="hint">以音箱回报为准</span>
    </div>
    <div class="playback-fields">
      <md-outlined-select
        id="device-music-source"
        label="音箱默认音乐源"
        :value="String(state.info.music_source || '')"
        :disabled="busy || !connected || !flag(state.info.Unisound)"
        @change="change($event, 'source')"
      >
        <md-select-option v-for="item in sources" :key="item.value" :value="item.value"
          ><div slot="headline">{{ item.label }}</div></md-select-option
        >
      </md-outlined-select>
      <md-outlined-select
        id="playback-engine"
        label="播放引擎"
        :value="String(state.info.PlayerType ?? '')"
        :disabled="
          busy ||
          !connected ||
          (state.version ?? 0) < 1856 ||
          ![1, 2].includes(numeric(state.info.PlayerType))
        "
        @change="change($event, 'engine')"
      >
        <md-select-option value="1"><div slot="headline">MediaPlayer</div></md-select-option>
        <md-select-option value="2"><div slot="headline">ExoPlayer</div></md-select-option>
      </md-outlined-select>
      <md-outlined-select
        id="playback-quality"
        label="首选音质"
        :value="String(state.info.ExoPlayer_Quality ?? '')"
        :disabled="
          busy ||
          !connected ||
          engine !== 2 ||
          (state.version ?? 0) < 1863 ||
          state.info.ExoPlayer_Quality === undefined
        "
        @change="change($event, 'quality')"
      >
        <md-select-option v-for="(label, index) in qualities" :key="index" :value="String(index)"
          ><div slot="headline">{{ label }}</div></md-select-option
        >
      </md-outlined-select>
    </div>
    <p class="hint">
      默认音乐源用于音箱的点播服务，依赖 Unisound，与网页搜索来源分别设置，不需要在此登录账号。
    </p>
    <p class="hint">
      当前引擎：{{
        engine === 2 ? "ExoPlayer" : engine === 1 ? "MediaPlayer" : "未上报"
      }}。首选音质由 ExoPlayer 使用，实际音质受音源、曲目权限和设备解码能力限制。
    </p>
    <dl v-if="details.length" class="data-list">
      <div v-for="[label, value] in details" :key="label">
        <dt>{{ label }}</dt>
        <dd>{{ value }}</dd>
      </div>
    </dl>
    <p v-else class="hint">当前曲目未提供音频格式详情。</p>
    <p v-if="error" class="notice error" role="alert">{{ error }}</p>
    <p v-if="status" class="hint" role="status">{{ status }}</p>
  </article>
</template>

<style scoped>
.playback-fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr));
  gap: 16px;
  margin-bottom: 16px;
}
.playback-fields > * {
  min-width: 0;
}
.playback-settings > .hint {
  margin-top: 8px;
  line-height: 1.6;
}
.playback-settings > .data-list {
  margin-top: 16px;
}
</style>
