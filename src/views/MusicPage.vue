<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import AppIcon from "../components/AppIcon.vue";
import EmptyState from "../components/EmptyState.vue";
import { action, array, flag, formatTime, numeric, object } from "../lib/protocol";
import {
  canEditQueue,
  cancelSleep,
  changeMode,
  connected,
  editQueue,
  musicApi,
  notify,
  playback,
  seek,
  send,
  sleep,
  state,
  track,
  volume,
  type Track,
} from "../lib/speaker";

const modeLabel = computed(
  () =>
    ({ 1: "随机播放", 2: "顺序播放", 3: "单曲循环" })[state.music.mode as 1 | 2 | 3] || "顺序播放",
);
const activeLyric = computed(() => {
  let index = -1;
  state.lyrics.forEach((line, i) => {
    if (line.time <= state.music.position) index = i;
  });
  return Math.max(0, index);
});
const visibleLyrics = computed(() =>
  state.lyrics.slice(Math.max(0, activeLyric.value - 1), Math.max(0, activeLyric.value - 1) + 4),
);
const searchOpen = ref(false);
const keyword = ref("");
const source = ref("qq");
const results = ref<Track[]>([]);
const searching = ref(false);
const searched = ref(false);
const searchError = ref("");
let request: AbortController | null = null;
let resultsSession = -1;
let requestNumber = 0;
const timerOpen = ref(false);
const sleepMinutes = ref(30);
const queueOpen = ref(false);
const coverFailed = ref(false);
watch(
  () => state.music.cover,
  () => {
    coverFailed.value = false;
  },
);
watch(
  () => state.session,
  () => {
    request?.abort();
    ++requestNumber;
    searching.value = false;
    results.value = [];
    searched.value = false;
  },
);
watch(searchOpen, (open) => {
  if (!open) {
    request?.abort();
    ++requestNumber;
    searching.value = false;
  }
});
onBeforeUnmount(() => request?.abort());

async function search() {
  if (!keyword.value.trim()) return;
  request?.abort();
  const controller = new AbortController();
  request = controller;
  const number = ++requestNumber;
  const session = state.session;
  searching.value = true;
  searchError.value = "";
  results.value = [];
  searched.value = false;
  try {
    const url = musicApi();
    url.searchParams.set("keyword", keyword.value.trim());
    url.searchParams.set("source", source.value);
    url.searchParams.set("page", "1");
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`音乐服务返回 ${response.status}`);
    const json = object(await response.json());
    if (numeric(json.code) !== 1) throw new Error(String(json.msg || "音乐服务未返回搜索结果"));
    if (session !== state.session || controller.signal.aborted || number !== requestNumber) return;
    results.value = array(object(json.data).list).map(track);
    resultsSession = session;
    searched.value = true;
  } catch (error) {
    if (controller.signal.aborted || number !== requestNumber) return;
    searchError.value = `${(error as Error).message}。可在设置中检查音乐接口和跨域支持。`;
  } finally {
    if (number === requestNumber) searching.value = false;
  }
}

function playResult(song: Track, append: boolean) {
  if (resultsSession !== state.session || !connected.value) {
    notify("连接已变更，请重新搜索。");
    return;
  }
  if (!canEditQueue.value) {
    notify("精确点播和队列追加需要 EchoService ≥ 1.8.87；旧设备可使用语音点播。");
    return;
  }
  const item: Record<string, unknown> = {
    itemId: song.id,
    title: song.title,
    artist: song.artist,
    album: "",
    albumUrl: song.cover,
    itemType: 0,
  };
  if (!flag(state.info.Unisound)) {
    const url = musicApi();
    url.searchParams.set("url", song.id);
    item.url = url.href;
  }
  const payload = append
    ? { curItemId: song.id, pageIndex: 1, itemList: [item] }
    : { curItemId: song.id, index: 0, itemList: [item] };
  if (send(action(4, append ? 19 : 15, -1, JSON.stringify(payload)))) {
    notify(append ? "已发送追加指令。" : "已发送播放指令。");
    send({ type: "list" });
  }
}
function voicePlay() {
  const text = keyword.value.trim();
  if (text && send(action(65536, 0, 1, `web_播放${text}`))) {
    searchOpen.value = false;
    notify("已发送语音点播指令，需设备语音服务支持。");
  }
}
function remove(index: number) {
  const session = state.session;
  if (
    confirm(`从队列删除“${state.queue[index]?.title || "这首歌曲"}”？`) &&
    state.session === session
  )
    editQueue("remove", index);
}
function setTimer() {
  sleep(sleepMinutes.value);
  timerOpen.value = false;
}
</script>

<template>
  <section class="page music-page">
    <div class="page-heading">
      <div>
        <p class="eyebrow">你的音乐空间</p>
        <h1>{{ connected && state.music.title ? "正在播放" : "音乐" }}</h1>
        <p class="muted">
          {{ connected ? "此刻的声音，由你掌控。" : "连接音箱，开启一段好时光。" }}
        </p>
      </div>
      <md-filled-tonal-button :disabled="!connected" @click="searchOpen = true"
        ><AppIcon slot="icon" name="search" :size="18" />搜索音乐</md-filled-tonal-button
      >
    </div>
    <EmptyState v-if="!connected" icon="music" />
    <template v-else>
      <div class="music-grid">
        <article class="card listening-card">
          <div class="now-playing">
            <div class="album-art">
              <img
                v-if="state.music.cover && !coverFailed"
                :src="state.music.cover"
                alt="当前歌曲封面"
                referrerpolicy="no-referrer"
                @error="coverFailed = true"
              />
              <div v-else class="album-placeholder">
                <AppIcon name="music" :size="72" /><span>R1 Control</span>
              </div>
            </div>
            <div class="song-details">
              <span class="tonal-label">{{ state.music.playing ? "正在播放" : "已暂停" }}</span>
              <h2>{{ state.music.title || "还没有播放音乐" }}</h2>
              <p class="muted">
                {{ state.music.artist || "从搜索或设备开始播放"
                }}<template v-if="state.music.album"> · {{ state.music.album }}</template>
              </p>
              <div class="lyrics" aria-label="歌词">
                <template v-if="visibleLyrics.length"
                  ><p
                    v-for="line in visibleLyrics"
                    :key="line.time + line.text"
                    :class="{ current: state.lyrics[activeLyric]?.time === line.time }"
                  >
                    {{ line.text }}
                  </p></template
                >
                <p v-else class="muted">
                  {{
                    state.music.title ? "暂无歌词，享受音乐本身。" : "音乐响起时，这里会显示歌词。"
                  }}
                </p>
              </div>
            </div>
          </div>
          <div class="seek-row">
            <span>{{ formatTime(state.music.position) }}</span
            ><md-slider
              id="music-progress"
              aria-label="播放进度"
              :min="0"
              :max="Math.max(1, state.music.duration)"
              :value="state.music.position"
              :disabled="!state.music.duration"
              @change="seek(Number(($event.target as HTMLInputElement).value))"
            /><span>{{ formatTime(state.music.duration) }}</span>
          </div>
          <div class="player-controls">
            <md-icon-button @click="changeMode" :aria-label="modeLabel"
              ><AppIcon :name="state.music.mode === 1 ? 'shuffle' : 'repeat'" /><span
                v-if="state.music.mode === 3"
                class="repeat-one"
                >1</span
              ></md-icon-button
            ><md-icon-button aria-label="上一首" @click="send({ type: 'prev' })"
              ><AppIcon name="prev" :size="28" /></md-icon-button
            ><button
              class="play-button"
              :aria-label="state.music.playing ? '暂停播放' : '继续播放'"
              @click="playback"
            >
              <AppIcon :name="state.music.playing ? 'pause' : 'play'" :size="32" /></button
            ><md-icon-button aria-label="下一首" @click="send({ type: 'next' })"
              ><AppIcon name="next" :size="28" /></md-icon-button
            ><md-icon-button aria-label="展开播放队列" @click="queueOpen = !queueOpen"
              ><AppIcon name="queue"
            /></md-icon-button>
          </div>
          <div class="volume-row">
            <AppIcon name="volume" /><label>音量</label
            ><md-slider
              id="music-volume"
              aria-label="音量"
              :min="0"
              :max="state.music.maxVolume"
              :value="state.music.volume"
              @change="volume(Number(($event.target as HTMLInputElement).value))"
            /><span>{{ Math.round((state.music.volume / state.music.maxVolume) * 100) }}%</span>
          </div>
        </article>
        <article class="card queue-card" :class="{ 'mobile-expanded': queueOpen }">
          <div class="section-heading">
            <h2>播放队列</h2>
            <span class="muted">{{ state.queue.length }} 首</span
            ><md-icon-button aria-label="刷新队列" @click="send({ type: 'list' })"
              ><AppIcon name="refresh" :size="20"
            /></md-icon-button>
          </div>
          <div v-if="!state.queue.length" class="small-empty">
            <AppIcon name="queue" :size="36" />
            <p>队列还是空的</p>
            <p class="hint">搜索音乐，或从手机推送到音箱。</p>
          </div>
          <ol v-else class="track-list">
            <li
              v-for="(song, index) in state.queue"
              :key="song.id + ':' + index"
              :class="{ selected: state.queueIndex === index }"
            >
              <button
                class="track-main"
                @click="send({ type: 'play', index })"
                :aria-label="`播放 ${song.title}`"
              >
                <span class="track-number">{{ String(index + 1).padStart(2, "0") }}</span
                ><span class="track-text"
                  ><strong>{{ song.title }}</strong
                  ><small>{{ song.artist || "未知歌手" }}</small></span
                ><span v-if="song.duration" class="hint">{{ formatTime(song.duration) }}</span>
              </button>
              <div v-if="canEditQueue" class="track-actions">
                <md-icon-button
                  :disabled="index === 0"
                  :aria-label="`上移 ${song.title}`"
                  @click="editQueue('move', index, index - 1)"
                  ><AppIcon name="up" :size="18" /></md-icon-button
                ><md-icon-button :aria-label="`删除 ${song.title}`" @click="remove(index)"
                  ><AppIcon name="close" :size="18"
                /></md-icon-button>
              </div>
            </li>
          </ol>
          <p v-if="state.queue.length && !canEditQueue" class="hint queue-note">
            队列移动与删除需要 EchoService 1.8.87。
          </p>
        </article>
      </div>
      <button class="mobile-queue-toggle card" @click="queueOpen = !queueOpen">
        <AppIcon name="queue" /><span
          >播放队列 <small>{{ state.queue.length }} 首</small></span
        ><AppIcon :name="queueOpen ? 'up' : 'arrow'" />
      </button>
      <div class="quick-grid">
        <button class="card quick-card" @click="timerOpen = true">
          <AppIcon name="clock" :size="28" /><span
            ><strong>定时暂停</strong
            ><small>{{
              state.sleepUntil
                ? new Date(state.sleepUntil).toLocaleTimeString("zh-CN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }) + " 暂停"
                : "让音乐陪你入眠"
            }}</small></span
          ><AppIcon name="arrow" /></button
        ><button class="card quick-card" @click="changeMode">
          <AppIcon :name="state.music.mode === 1 ? 'shuffle' : 'repeat'" :size="28" /><span
            ><strong>播放模式</strong><small>{{ modeLabel }}</small></span
          ><AppIcon name="arrow" /></button
        ><a class="card quick-card" href="#/sound"
          ><AppIcon name="equalizer" :size="28" /><span
            ><strong>音效</strong><small>调出喜欢的声音</small></span
          ><AppIcon name="arrow"
        /></a>
      </div>
    </template>
  </section>
  <md-dialog
    :open="searchOpen"
    @closed="searchOpen = false"
    class="search-dialog"
    aria-label="搜索音乐"
    ><div slot="headline">搜索音乐</div>
    <div slot="content" class="dialog-content">
      <form @submit.prevent="search" class="search-form">
        <md-outlined-text-field
          label="歌曲、歌手或专辑"
          :value="keyword"
          @input="keyword = ($event.target as HTMLInputElement).value"
          @keydown.enter.prevent="search"
        /><label class="select-field"
          ><span class="sr-only">搜索来源</span
          ><select v-model="source" aria-label="搜索来源">
            <option value="qq">QQ 音乐</option>
            <option value="netease">网易云音乐</option>
            <option value="kuwo">酷我音乐</option>
          </select></label
        ><md-filled-button :disabled="searching || !keyword.trim()" @click="search"
          >搜索</md-filled-button
        >
      </form>
      <p class="hint">匿名搜索，不提供账号登录。可用曲目与播放权限取决于音乐服务。</p>
      <md-text-button v-if="connected && keyword.trim()" @click="voicePlay"
        ><AppIcon slot="icon" name="mic" :size="18" />让音箱播放“{{
          keyword.trim()
        }}”</md-text-button
      >
      <div v-if="searching" class="loading-state" role="status">
        <md-circular-progress indeterminate />正在搜索…
      </div>
      <p v-if="searchError" role="alert" class="notice error">{{ searchError }}</p>
      <p v-if="state.toast" role="status" class="notice">{{ state.toast }}</p>
      <p v-if="searched && !results.length" class="small-empty">没有找到结果，换个关键词试试。</p>
      <ol class="search-results">
        <li v-for="(song, index) in results" :key="song.id + index">
          <div class="track-text">
            <strong>{{ song.title }}</strong
            ><small>{{ song.artist }}</small>
          </div>
          <md-text-button :disabled="!canEditQueue" @click="playResult(song, false)"
            >播放</md-text-button
          ><md-icon-button
            :disabled="!canEditQueue"
            :aria-label="`添加 ${song.title}`"
            @click="playResult(song, true)"
            ><AppIcon name="plus"
          /></md-icon-button>
        </li>
      </ol>
      <p v-if="results.length && !canEditQueue" class="hint">
        精确点播和追加需要 EchoService 1.8.87；当前设备可尝试上方语音点播。
      </p>
    </div>
    <div slot="actions">
      <md-text-button @click="searchOpen = false">关闭</md-text-button>
    </div></md-dialog
  >
  <md-dialog :open="timerOpen" @closed="timerOpen = false" aria-label="定时暂停"
    ><div slot="headline">定时暂停</div>
    <div slot="content" class="dialog-content">
      <p class="muted">在指定时间后发送暂停播放指令。</p>
      <div class="segmented">
        <button
          v-for="minutes in [15, 30, 60]"
          :key="minutes"
          :aria-pressed="sleepMinutes === minutes"
          @click="sleepMinutes = minutes"
        >
          {{ minutes }} 分钟
        </button>
      </div>
      <p class="hint">需保持本页打开并连接音箱。浏览器休眠可能延迟执行；断线或换机后自动取消。</p>
    </div>
    <div slot="actions">
      <md-text-button
        v-if="state.sleepUntil"
        @click="
          cancelSleep();
          timerOpen = false;
        "
        >取消定时</md-text-button
      ><md-text-button @click="timerOpen = false">关闭</md-text-button
      ><md-filled-button @click="setTimer">开始计时</md-filled-button>
    </div></md-dialog
  >
</template>
