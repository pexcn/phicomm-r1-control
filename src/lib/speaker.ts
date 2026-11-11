import { computed, reactive } from "vue";
import { SpeakerClient, type ConnectionStatus } from "./client.ts";
import {
  action,
  array,
  endpoint,
  flag,
  numeric,
  object,
  parseLyrics,
  queueEdit,
  safeImage,
  type Data,
  type Message,
} from "./protocol.ts";
import { load, save } from "./storage.ts";

export type Page = "music" | "screen" | "sound" | "bluetooth" | "device";
export type Track = {
  id: string;
  title: string;
  artist: string;
  cover: string;
  duration: number;
  raw: Data;
};
export type Band = { id: number; frequency: number; level: number };
export const pages: { id: Page; label: string; icon: string }[] = [
  { id: "music", label: "音乐", icon: "music" },
  { id: "screen", label: "屏幕", icon: "screen" },
  { id: "sound", label: "音效", icon: "equalizer" },
  { id: "bluetooth", label: "蓝牙", icon: "bluetooth" },
  { id: "device", label: "设备", icon: "speaker" },
];

const savedAddress = load("address", "");
const savedTheme = load("theme", "system");
const savedApi = load("music-api", "https://r1.wxfsq.com/music");
export const state = reactive({
  status: "disconnected" as ConnectionStatus,
  session: 0,
  address: typeof savedAddress === "string" ? savedAddress : "",
  theme: ["light", "dark", "system"].includes(savedTheme) ? savedTheme : "system",
  musicApi: typeof savedApi === "string" ? savedApi : "https://r1.wxfsq.com/music",
  connectionDialog: false,
  settingsDialog: false,
  error: "",
  toast: "",
  version: null as number | null,
  info: {} as Data,
  system: {
    firmware: "",
    cpu: null as number | null,
    temperature: "",
    memory: "",
    uptime: "",
    hostname: "",
  },
  music: {
    id: "",
    title: "",
    artist: "",
    album: "",
    cover: "",
    playing: false,
    position: 0,
    duration: 0,
    volume: 0,
    maxVolume: 30,
    mode: 2,
  },
  lyrics: [] as { time: number; text: string }[],
  queue: [] as Track[],
  queueIndex: -1,
  eq: {
    available: false,
    enabled: false,
    min: -1500,
    max: 1500,
    current: -1,
    bands: [] as Band[],
    presets: [] as { id: number; name: string }[],
  },
  bluetooth: {
    available: false,
    enabled: false,
    scanning: false,
    bonded: [] as Data[],
    scanned: [] as Data[],
    outputs: [] as string[],
    inputs: [] as string[],
  },
  screen: {
    active: false,
    image: "",
    width: 720,
    height: 480,
    imageWidth: 720,
    imageHeight: 480,
    sizeConfirmed: false,
    fps: 0,
    interval: 333,
  },
  sleepUntil: 0,
});

export const connected = computed(() => state.status === "connected");
export const canEditQueue = computed(
  () => connected.value && state.version !== null && state.version >= 1887,
);
export const deviceName = computed(() =>
  String(state.info.device_name || state.system.hostname || "Phicomm R1"),
);
export const connectionLabel = computed(
  () =>
    ({
      disconnected: "未连接",
      connecting: "连接中",
      connected: "已连接",
      reconnecting: "重新连接中",
    })[state.status],
);

let noticeTimer: ReturnType<typeof setTimeout>;
let sleepTimer: ReturnType<typeof setTimeout>;
let metadataRequest: AbortController | null = null;
let confirmed = false;
let lastFrameAt = 0;
let lastQueueAt = 0;

export function notify(message: string): void {
  clearTimeout(noticeTimer);
  state.toast = message;
  noticeTimer = setTimeout(() => {
    state.toast = "";
  }, 5000);
}

function releaseFrame(): void {
  if (state.screen.image.startsWith("blob:")) URL.revokeObjectURL(state.screen.image);
  state.screen.image = "";
  state.screen.fps = 0;
  lastFrameAt = 0;
}

function resetSession(): void {
  ++state.session;
  state.version = null;
  state.info = {};
  state.system = { firmware: "", cpu: null, temperature: "", memory: "", uptime: "", hostname: "" };
  state.music = {
    id: "",
    title: "",
    artist: "",
    album: "",
    cover: "",
    playing: false,
    position: 0,
    duration: 0,
    volume: 0,
    maxVolume: 30,
    mode: 2,
  };
  state.lyrics = [];
  state.queue = [];
  state.queueIndex = -1;
  state.eq = {
    available: false,
    enabled: false,
    min: -1500,
    max: 1500,
    current: -1,
    bands: [],
    presets: [],
  };
  state.bluetooth = {
    available: false,
    enabled: false,
    scanning: false,
    bonded: [],
    scanned: [],
    outputs: [],
    inputs: [],
  };
  metadataRequest?.abort();
  confirmed = false;
  state.screen.active = false;
  state.screen.sizeConfirmed = false;
  state.screen.width = state.screen.imageWidth = 720;
  state.screen.height = state.screen.imageHeight = 480;
  cancelSleep();
  releaseFrame();
}

const client = new SpeakerClient((event) => {
  if (event.kind === "status") {
    state.status = event.status;
    if (event.status !== "connected") resetSession();
    if (event.error) state.error = event.error;
    if (event.status === "connected") {
      state.error = "";
      state.connectionDialog = false;
      save("address", state.address);
    }
  } else if (event.kind === "frame") showFrame(URL.createObjectURL(event.frame));
  else receive(event.message);
});

export function connect(address: string): boolean {
  try {
    const url = endpoint(address);
    state.address = url.href;
    state.error = "";
    client.connect(url.href);
    return true;
  } catch (error) {
    state.error = (error as Error).message;
    return false;
  }
}

export function disconnect(): void {
  stopScreen();
  client.disconnect();
  state.error = "";
}

export function send(message: Message): boolean {
  if (!client.send(message)) {
    notify("请先连接音箱。");
    return false;
  }
  return true;
}

export function refresh(): void {
  if (!connected.value) return;
  client.send({ type: "get_info", type_id: "web-info" });
  client.send({ type: "get_device_info", type_id: "web-device" });
  client.send({
    type: "shell",
    type_id: "web-system",
    shell: "getprop ro.build.version.incremental; getprop net.hostname; cat /proc/uptime",
  });
  client.send({
    type: "shell",
    type_id: "web-temperature",
    shell: "cat /sys/class/hwmon/hwmon0/device/temp0_input",
  });
}

export function readPanel(page: Page): void {
  if (!connected.value) return;
  if (page === "sound") send({ type: "get_eq_config" });
  if (page === "bluetooth") send({ type: "BT_Device" });
  if (page === "device") refresh();
  if (page === "music") send({ type: "list" });
}

export function track(raw: unknown): Track {
  const row = object(raw);
  return {
    id: String(row.id ?? row.itemId ?? ""),
    title: String(row.title || row.name || "未命名歌曲"),
    artist: String(row.artist || row.arist || row.singer || ""),
    cover: safeImage(row.cover || row.albumUrl || row.pic),
    duration: numeric(row.duration),
    raw: row,
  };
}

function receive(message: Message): void {
  if (message.code !== undefined && ![0, 1, 200].includes(numeric(message.code))) {
    notify(String(message.msg || message.message || "设备未能完成操作。"));
    return;
  }
  const payload = object(message.data);
  switch (message.type) {
    case "get_info": {
      state.info = { ...state.info, ...payload };
      if (numeric(payload.ver) >= 1000) state.version = numeric(payload.ver);
      const song = object(payload.music_info);
      const nextId = payload.music_info === undefined ? state.music.id : String(song.id ?? "");
      const changed =
        payload.music_info !== undefined &&
        (nextId !== state.music.id || String(song.title ?? "") !== state.music.title);
      if (changed) {
        metadataRequest?.abort();
        state.lyrics = [];
        Object.assign(state.music, {
          id: nextId,
          title: String(song.title || ""),
          artist: String(song.artist || song.arist || ""),
          album: String(song.album || ""),
          cover: safeImage(song.albumUrl || song.cover),
          position: 0,
          duration: 0,
        });
      }
      if (payload.play_state !== undefined) state.music.playing = flag(payload.play_state);
      else if (song.playing !== undefined) state.music.playing = flag(song.playing);
      if (payload.vol !== undefined) state.music.volume = numeric(payload.vol);
      if (payload.play_mode !== undefined) state.music.mode = numeric(payload.play_mode, 2);
      if (song.position !== undefined) state.music.position = numeric(song.position);
      if (song.duration !== undefined) state.music.duration = numeric(song.duration);
      if (song.title) state.music.title = String(song.title);
      if (song.artist || song.arist) state.music.artist = String(song.artist || song.arist);
      if (song.albumUrl || song.cover) state.music.cover = safeImage(song.albumUrl || song.cover);
      if (changed && nextId) void metadata(nextId, song);
      if (!confirmed && state.version !== null) {
        confirmed = true;
        refresh();
        client.send({ type: "get_eq_config" });
        client.send({ type: "BT_Device" });
      }
      if (Date.now() - lastQueueAt > 10000) {
        lastQueueAt = Date.now();
        client.send({ type: "list" });
      }
      break;
    }
    case "max_vol": {
      const max = numeric(message.data);
      if (max > 0 && max <= 100) state.music.maxVolume = max;
      break;
    }
    case "list": {
      const rows = Array.isArray(message.data)
        ? message.data
        : array(payload.playList ?? payload.list);
      state.queue = rows.map(track);
      state.queueIndex = numeric(payload.playIndex ?? payload.index, -1);
      break;
    }
    case "get_device_info": {
      const info = Object.keys(object(payload.nameValuePairs)).length
        ? object(payload.nameValuePairs)
        : payload;
      state.system.firmware = String(info.incremental || state.system.firmware);
      const seconds = numeric(info.elapsedRealtime) / 1000;
      if (seconds > 0)
        state.system.uptime = `${Math.floor(seconds / 3600)} 小时 ${Math.floor(seconds / 60) % 60} 分钟`;
      const cpu = array(info.cpuinfo);
      if (cpu.length > 3) state.system.cpu = numeric(cpu[3]);
      const mem = String(info.meminfo || "");
      const total = numeric(mem.match(/MemTotal:\s*(\d+)/)?.[1]);
      const available = numeric(mem.match(/MemAvailable:\s*(\d+)/)?.[1], -1);
      const free =
        available >= 0
          ? available
          : numeric(mem.match(/MemFree:\s*(\d+)/)?.[1]) +
            numeric(mem.match(/Cached:\s*(\d+)/)?.[1]);
      if (total > 0)
        state.system.memory = `${Math.round((total - free) / 1024)} / ${Math.round(total / 1024)} MB`;
      break;
    }
    case "get_eq_config": {
      const eq = object(payload.eq);
      const bands = object(eq.Bands);
      state.eq = {
        available: Object.keys(eq).length > 0,
        enabled: eq.sound_effects_eq_enable === undefined ? true : flag(eq.sound_effects_eq_enable),
        min: numeric(bands.minBandLevel, -1500),
        max: numeric(bands.maxBandLevel, 1500),
        current: numeric(eq.Current_Preset, -1),
        presets: array(eq.Preset_list).map((value) => {
          const row = object(value);
          return { id: numeric(row.Preset), name: String(row.Name || "预设") };
        }),
        bands: array(bands.list).map((value) => {
          const row = object(value);
          return {
            id: numeric(row.Band),
            frequency: numeric(row.Frequency),
            level: numeric(row.BandLevel),
          };
        }),
      };
      break;
    }
    case "BT_Device":
      state.bluetooth = {
        available: true,
        enabled: flag(payload.Enabled),
        scanning: flag(payload.Scanning),
        bonded: array(payload.Bonded_Devices).map(object),
        scanned: array(payload.Scan_Devices).map(object),
        outputs: array(payload.A2dp_ConnectedDevices).map(String),
        inputs: array(payload.A2dpSink_ConnectedDevices).map(String),
      };
      break;
    case "BT_enable":
    case "BT_disable":
      client.send({ type: "BT_Device" });
      break;
    case "screencap":
    case "screencap_frame": {
      const image = safeImage(message.data);
      if (image) showFrame(image);
      break;
    }
    case "start_screencap_ack":
      state.screen.active = true;
      break;
    case "stop_screencap_ack":
      state.screen.active = false;
      break;
  }
  if (message.type === "shell") {
    const lines = String(message.data || "")
      .trim()
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (message.type_id === "web-system") {
      const numericLine = lines.find((line) => /^\d{4,}$/.test(line));
      if (numericLine) state.system.firmware = numericLine;
      const hostname = lines.find((line) => /^Phicomm_R1_/i.test(line));
      if (hostname) state.system.hostname = hostname;
      const uptime = lines.find((line) => /^\d+\.\d+\s+\d/.test(line));
      if (uptime) {
        const seconds = parseFloat(uptime);
        state.system.uptime = `${Math.floor(seconds / 3600)} 小时 ${Math.floor(seconds / 60) % 60} 分钟`;
      }
    }
    if (message.type_id === "web-temperature") {
      const text = lines.find((line) => /^\d+(\.\d+)?$/.test(line));
      if (text) {
        const temp = Number(text);
        state.system.temperature = `${Math.round(temp > 1000 ? temp / 1000 : temp)}°C`;
      }
    }
    if (message.type_id === "web-size") {
      const match = lines
        .join(" ")
        .match(/(?:Override size:|Physical size:)\s*(\d+)x(\d+)/g)
        ?.at(-1)
        ?.match(/(\d+)x(\d+)/);
      if (match) {
        state.screen.width = Number(match[1]);
        state.screen.height = Number(match[2]);
        state.screen.sizeConfirmed = true;
      }
    }
  }
}

function showFrame(image: string): void {
  const previous = state.screen.image;
  state.screen.image = image;
  if (previous.startsWith("blob:")) URL.revokeObjectURL(previous);
  const now = performance.now();
  if (lastFrameAt)
    state.screen.fps = Math.min(60, Math.round(1000 / Math.max(1, now - lastFrameAt)));
  lastFrameAt = now;
}

export function startScreen(): void {
  if (!connected.value) return;
  if (send({ type: "start_screencap", interval: state.screen.interval })) {
    state.screen.active = true;
    send({ type: "shell", type_id: "web-size", shell: "wm size" });
  }
}

export function stopScreen(): void {
  if (state.screen.active && connected.value) client.send({ type: "stop_screencap" });
  state.screen.active = false;
}

export function key(code: number): void {
  send({ type: "input", input: `keyevent ${code}` });
}
export function playback(): void {
  send(action(4, state.music.playing ? 2 : 3, -1, true));
}
export function seek(position: number): void {
  if (send({ type: "set_position", position: Math.round(position) })) send(action(4, 3, -1, true));
}
export function volume(value: number): void {
  send({ type: "set_vol", vol: Math.max(0, Math.min(state.music.maxVolume, Math.round(value))) });
}
export function changeMode(): void {
  send({
    type: "set_play_mode",
    mode: ({ 1: 3, 2: 1, 3: 2 } as Record<number, number>)[state.music.mode] || 2,
  });
}

export function editQueue(command: "move" | "remove", from: number, to?: number): void {
  try {
    if (!canEditQueue.value) throw new Error("队列编辑需要当前连接确认 EchoService ≥ 1.8.87。");
    if (send(queueEdit(state.version, command, from, to))) send({ type: "list" });
  } catch (error) {
    notify((error as Error).message);
  }
}

export function cancelSleep(): void {
  clearTimeout(sleepTimer);
  state.sleepUntil = 0;
}
export function sleep(minutes: number): void {
  cancelSleep();
  if (!connected.value || minutes <= 0) return;
  const session = state.session;
  state.sleepUntil = Date.now() + minutes * 60000;
  sleepTimer = setTimeout(() => {
    if (session === state.session && connected.value) {
      send(action(4, 2, -1, true));
      notify("已发送暂停播放指令。");
    }
    state.sleepUntil = 0;
  }, minutes * 60000);
}

export function musicApi(): URL {
  const url = new URL(state.musicApi);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password)
    throw new Error("请填写有效的音乐接口 HTTP(S) 地址。");
  return url;
}

async function metadata(id: string, song: Data): Promise<void> {
  const controller = new AbortController();
  metadataRequest = controller;
  const session = state.session;
  try {
    const response = await fetch(musicApi(), {
      method: "POST",
      body: new URLSearchParams({ info: id, music_info: JSON.stringify(song) }),
      signal: controller.signal,
    });
    if (!response.ok) return;
    const json = object(await response.json());
    if (session !== state.session || state.music.id !== id || controller.signal.aborted) return;
    if (numeric(json.code) !== 1) return;
    const data = object(json.data);
    if (data.pic) state.music.cover = safeImage(data.pic);
    state.lyrics = parseLyrics(data.lrc);
  } catch {
    /* Device playback works independently of the optional metadata API. */
  }
}

export function dispose(): void {
  client.disconnect();
  cancelSleep();
  clearTimeout(noticeTimer);
  metadataRequest?.abort();
  releaseFrame();
}
