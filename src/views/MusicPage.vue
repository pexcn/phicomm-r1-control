<script setup lang="ts">
import { useConfirmation } from "../lib/confirmation";
import AppDialog from "../components/AppDialog.vue";
import AppSlider from "../components/AppSlider.vue";
import VolumeSlider from "../components/VolumeSlider.vue";
import MaterialState from "../components/MaterialState.vue";
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import AppIcon from "../components/AppIcon.vue";
import EmptyState from "../components/EmptyState.vue";
import TurntablePlayer from "../components/TurntablePlayer.vue";
import LocalMusicDialog from "../components/LocalMusicDialog.vue";
import AtmosphereLightDialog from "../components/AtmosphereLightDialog.vue";
import PlaybackSettingsCard from "../components/PlaybackSettingsCard.vue";
import { searchPlayback, playbackPresentation, audioSourceError } from "../lib/music-playback";
import { action, array, formatTime, numeric, object } from "../lib/protocol";
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
  type Track,
} from "../lib/speaker";

const confirmAction = useConfirmation();
const playbackView = computed(() => playbackPresentation(state.music));
const sourceError = computed(() => audioSourceError(state.info));
const modeLabel = computed(
  () =>
    ({ 1: "随机播放", 2: "顺序播放", 3: "单曲循环" })[state.music.mode as 1 | 2 | 3] || "顺序播放",
);
const modeIcon = computed(
  () => ({ 1: "shuffle", 2: "repeat", 3: "repeatOne" })[state.music.mode as 1 | 2 | 3] || "repeat",
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
const queueHeading = ref<HTMLElement>();
const queueRows = computed(() => {
  const counts = new Map<string, number>();
  return state.queue.map((song) => {
    const identity = song.id || JSON.stringify([song.title, song.artist]);
    const occurrence = (counts.get(identity) ?? 0) + 1;
    counts.set(identity, occurrence);
    return { song, key: `${identity}:${occurrence}` };
  });
});
const localOpen = ref(false);
const lightOpen = ref(false);
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

function jumpToQueue() {
  queueHeading.value?.focus();
  queueHeading.value?.scrollIntoView({ block: "nearest" });
}
async function toggleQueue(event: MouseEvent) {
  const trigger = event.currentTarget as HTMLButtonElement;
  queueOpen.value = !queueOpen.value;
  if (!queueOpen.value) return;
  await nextTick();
  const heading = queueHeading.value;
  const bottomNav = document.querySelector(".bottom-nav")?.getBoundingClientRect();
  if (heading && bottomNav && heading.getBoundingClientRect().bottom > bottomNav.top) {
    trigger.scrollIntoView({ block: "start" });
  }
}

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
  try {
    if (send(searchPlayback(song, append, musicApi()))) {
      notify(append ? "已发送追加请求，等待音箱确认。" : "已发送播放请求，等待音箱加载音频。");
      send({ type: "list" });
    }
  } catch (cause) {
    searchError.value = (cause as Error).message;
  }
}
function voicePlay() {
  const text = keyword.value.trim();
  if (text && send(action(65536, 0, 1, `web_播放${text}`))) {
    searchOpen.value = false;
    notify("已发送语音点播指令，需设备语音服务支持。");
  }
}
async function remove(index: number) {
  const session = state.session;
  const song = state.queue[index];
  if (!song || state.queueBusy) return;
  if (state.queueIndex < 0 || index === state.queueIndex) {
    notify(
      state.queueIndex < 0
        ? "尚未确认当前播放项，请刷新队列后再删除。"
        : "EchoService 不允许删除当前播放项，暂停后也不能删除。",
    );
    return;
  }
  if (
    (await confirmAction({
      title: "删除队列歌曲？",
      message: `从队列删除“${song.title || "这首歌曲"}”？`,
      action: "删除歌曲",
      danger: true,
    })) &&
    state.session === session &&
    connected.value &&
    state.queue[index]?.id === song.id &&
    state.queue[index]?.title === song.title &&
    state.queue[index]?.artist === song.artist
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
        <h1>{{ connected && state.music.title ? playbackView.label : "音乐" }}</h1>
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
              <TurntablePlayer
                :cover="state.music.cover"
                :title="state.music.title"
                :artist="state.music.artist"
                :track-id="state.music.id"
                :playing="playbackView.spinning"
                :position="state.music.position"
                :duration="state.music.duration"
              />
            </div>
            <div class="song-details">
              <span class="tonal-label" :class="{ error: playbackView.error }">{{
                playbackView.label
              }}</span>
              <h2>{{ state.music.title || "还没有播放音乐" }}</h2>
              <p class="muted">
                {{ state.music.artist || "从搜索或设备开始播放"
                }}<template v-if="state.music.album"> · {{ state.music.album }}</template>
              </p>
              <p
                v-if="playbackView.hint"
                class="notice playback-notice"
                :class="{ error: playbackView.error }"
                :role="playbackView.error ? 'alert' : 'status'"
              >
                {{ playbackView.hint }}<template v-if="sourceError"> {{ sourceError }}</template>
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
            ><AppSlider
              id="music-progress"
              variant="progress"
              :format-value="formatTime"
              aria-label="播放进度"
              :min="0"
              :max="Math.max(1, state.music.duration)"
              :value="state.music.position"
              :disabled="!state.music.duration"
              @change="seek(Number(($event.target as HTMLInputElement).value))"
            /><span>{{
              state.music.duration > 0 ? formatTime(state.music.duration) : "--:--"
            }}</span>
          </div>
          <div class="player-controls">
            <md-icon-button @click="changeMode" :aria-label="modeLabel"
              ><AppIcon :name="modeIcon" /></md-icon-button
            ><md-icon-button aria-label="上一首" @click="send({ type: 'prev' })"
              ><AppIcon name="prev" :size="28" /></md-icon-button
            ><md-filled-icon-button
              class="play-button"
              :aria-label="state.music.playing ? '暂停播放' : '继续播放'"
              @click="playback"
            >
              <AppIcon
                :key="Number(state.music.playing)"
                class="playback-symbol"
                :name="state.music.playing ? 'pause' : 'play'"
                :size="32" /></md-filled-icon-button
            ><md-icon-button aria-label="下一首" @click="send({ type: 'next' })"
              ><AppIcon name="next" :size="28" /></md-icon-button
            ><md-icon-button
              class="desktop-queue-jump"
              aria-label="跳到播放队列"
              @click="jumpToQueue"
              ><AppIcon name="queue"
            /></md-icon-button>
          </div>
          <VolumeSlider id="music-volume" show-label />
        </article>
        <button
          class="mobile-queue-toggle card"
          :aria-expanded="queueOpen"
          aria-controls="playback-queue"
          @click="toggleQueue"
        >
          <MaterialState /><AppIcon name="queue" /><span
            >播放队列 <small>{{ state.queue.length }} 首</small></span
          ><AppIcon class="disclosure-chevron" name="down" />
        </button>
        <div class="queue-disclosure" :class="{ expanded: queueOpen }">
          <div class="queue-clip">
            <article id="playback-queue" class="card queue-card">
              <div class="section-heading">
                <h2 ref="queueHeading" tabindex="-1">播放队列</h2>
                <span class="muted">{{ state.queue.length }} 首</span
                ><md-icon-button
                  aria-label="刷新队列"
                  :disabled="state.queueBusy"
                  @click="send({ type: 'list' })"
                  ><AppIcon name="refresh" :size="20"
                /></md-icon-button>
              </div>
              <div v-if="!state.queue.length" class="small-empty">
                <AppIcon name="queue" :size="36" />
                <p>队列还是空的</p>
                <p class="hint">搜索音乐，或从手机推送到音箱。</p>
              </div>
              <TransitionGroup v-else tag="ol" name="queue-row" class="track-list">
                <li
                  v-for="({ song, key }, index) in queueRows"
                  :key="key"
                  :class="{ selected: state.queueIndex === index }"
                >
                  <button
                    class="track-main"
                    @click="send({ type: 'play', index })"
                    :aria-label="`播放 ${song.title}`"
                  >
                    <MaterialState />
                    <span class="track-number">{{ String(index + 1).padStart(2, "0") }}</span
                    ><span class="track-text"
                      ><strong>{{ song.title }}</strong
                      ><small>{{ song.artist || "未知歌手" }}</small></span
                    ><span v-if="song.duration" class="hint">{{ formatTime(song.duration) }}</span>
                  </button>
                  <div v-if="canEditQueue" class="track-actions">
                    <md-icon-button
                      :disabled="state.queueBusy || index === 0"
                      :aria-label="`上移 ${song.title}`"
                      @click="editQueue('move', index, index - 1)"
                      ><AppIcon name="up" :size="18" /></md-icon-button
                    ><md-icon-button
                      :disabled="
                        state.queueBusy || state.queueIndex < 0 || index === state.queueIndex
                      "
                      :title="index === state.queueIndex ? '当前播放项不能删除' : '从队列删除'"
                      :aria-label="`删除 ${song.title}`"
                      @click="remove(index)"
                      ><AppIcon name="close" :size="18"
                    /></md-icon-button>
                  </div>
                </li>
              </TransitionGroup>
              <p v-if="state.queue.length && canEditQueue" class="hint queue-note" role="status">
                {{
                  state.queueBusy
                    ? "正在核对删除结果…"
                    : state.queueIndex < 0
                      ? "尚未确认当前播放项，请刷新队列后再删除。"
                      : state.queue.length === 1
                        ? "当前播放项不能删除；设备不支持通过此接口清空队列。"
                        : "当前播放项不能删除，先切换到另一首后可删除原歌曲。"
                }}
              </p>
              <p v-if="state.queue.length && !canEditQueue" class="hint queue-note">
                队列移动与删除需要 EchoService 1.8.87。
              </p>
            </article>
          </div>
        </div>
      </div>
      <div class="quick-grid">
        <button class="card quick-card" @click="localOpen = true">
          <MaterialState /><AppIcon name="music" :size="28" /><span
            ><strong>本地音乐</strong><small>扫描音箱存储与路径点播</small></span
          ><AppIcon name="arrow" />
        </button>
        <button class="card quick-card" @click="lightOpen = true">
          <MaterialState /><AppIcon name="sun" :size="28" /><span
            ><strong>氛围灯</strong><small>亮度、效果与灯光颜色</small></span
          ><AppIcon name="arrow" />
        </button>
        <button class="card quick-card" @click="timerOpen = true">
          <MaterialState /> <AppIcon name="clock" :size="28" /><span
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
          <MaterialState />
          <AppIcon :name="modeIcon" :size="28" /><span
            ><strong>播放模式</strong><small>{{ modeLabel }}</small></span
          ><AppIcon name="arrow" /></button
        ><a class="card quick-card" href="#/sound"
          ><MaterialState /><AppIcon name="equalizer" :size="28" /><span
            ><strong>音效</strong><small>调出喜欢的声音</small></span
          ><AppIcon name="arrow"
        /></a>
      </div>
      <PlaybackSettingsCard />
    </template>
  </section>
  <AppDialog
    :open="searchOpen"
    @closed="searchOpen = false"
    class="search-dialog"
    mode="adaptive"
    aria-label="搜索音乐"
    ><template #headline><div>搜索音乐</div></template>
    <div slot="content" class="dialog-content">
      <form @submit.prevent="search" class="search-form">
        <md-outlined-text-field
          label="歌曲、歌手或专辑"
          :value="keyword"
          @input="keyword = ($event.target as HTMLInputElement).value"
          @keydown.enter.prevent="search"
        /><md-outlined-select
          label="来源"
          aria-label="搜索来源"
          :value="source"
          @change="source = ($event.target as HTMLElement & { value: string }).value"
        >
          <md-select-option value="qq"><div slot="headline">QQ 音乐</div></md-select-option>
          <md-select-option value="netease"><div slot="headline">网易云音乐</div></md-select-option>
          <md-select-option value="kuwo"
            ><div slot="headline">酷我音乐</div></md-select-option
          > </md-outlined-select
        ><md-filled-button :disabled="searching || !keyword.trim()" @click="search"
          >搜索</md-filled-button
        >
      </form>
      <p class="hint">匿名搜索和点播，不提供账号登录。音频可用性与音质取决于音乐服务及音箱网络。</p>
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
      <ol v-if="results.length" class="search-results motion-reveal">
        <li v-for="(song, index) in results" :key="song.id + index">
          <div class="track-text">
            <strong>{{ song.title }}</strong
            ><small>{{ song.artist }}</small>
          </div>
          <md-text-button
            :disabled="!canEditQueue"
            :aria-label="`播放 ${song.title}${song.artist ? ` · ${song.artist}` : ''}`"
            @click="playResult(song, false)"
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
    </div></AppDialog
  >
  <LocalMusicDialog :open="localOpen" @close="localOpen = false" />
  <AtmosphereLightDialog :open="lightOpen" @close="lightOpen = false" />
  <AppDialog :open="timerOpen" @closed="timerOpen = false" aria-label="定时暂停"
    ><template #headline><div>定时暂停</div></template>
    <div slot="content" class="dialog-content">
      <p class="muted">在指定时间后发送暂停播放指令。</p>
      <div class="segmented" role="group" aria-label="定时暂停时长">
        <button
          v-for="minutes in [15, 30, 60]"
          :key="minutes"
          :aria-pressed="sleepMinutes === minutes"
          @click="sleepMinutes = minutes"
        >
          <MaterialState /><AppIcon v-if="sleepMinutes === minutes" name="check" :size="18" />
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
    </div></AppDialog
  >
</template>
