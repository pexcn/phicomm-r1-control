import { action, numeric, object, type Message } from "./protocol.ts";

type SearchSong = { id: string; title: string; artist: string; cover: string };

// The speaker fetches this URL, not the HTTPS page. The original public HTTP
// resolver redirects to HTTP audio; ExoPlayer's default source rejects a
// redirect across protocols. Never downgrade custom endpoints or their tokens.
export function searchPlayback(song: SearchSong, append: boolean, api: URL): Message {
  if (!song.id.trim()) throw new Error("搜索结果缺少歌曲 ID，请重新搜索。");
  const url = new URL(api.href);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password)
    throw new Error("请填写有效的音乐接口 HTTP(S) 地址。");
  if (url.href === "https://r1.wxfsq.com/music") url.protocol = "http:";
  url.searchParams.set("url", song.id);
  const item = {
    itemId: song.id,
    title: song.title,
    artist: song.artist,
    album: "",
    albumUrl: song.cover,
    itemType: 0,
    // Anonymous search must not depend on Unisound's private API credentials.
    url: url.href,
  };
  return action(
    4,
    append ? 19 : 15,
    -1,
    JSON.stringify(
      append
        ? { curItemId: song.id, pageIndex: 1, itemList: [item] }
        : { curItemId: song.id, index: 0, itemList: [item] },
    ),
  );
}

type Playback = {
  title: string;
  playing: boolean;
  playerState: number | null;
  position: number;
  duration: number;
};
export function playbackPresentation(music: Playback) {
  const status = music.playerState;
  if (!music.title) return { label: "未播放", spinning: false, hint: "", error: false };
  // Both analyzed EchoService engines expose PlayPositionInfo.status here.
  if (status === 4)
    return {
      label: "播放失败",
      spinning: false,
      error: true,
      hint: "音箱报告播放失败。封面和歌词不代表音频已加载，请重新搜索点播或更换音源，并检查音箱网络。",
    };
  if (status === 0) return { label: "已停止", spinning: false, hint: "", error: false };
  if (status === 5) return { label: "已播放完", spinning: false, hint: "", error: false };
  if (status === 2) return { label: "已暂停", spinning: false, hint: "", error: false };
  if (status === 6) return { label: "正在缓冲", spinning: false, hint: "", error: false };
  if (status === 3 || status === 10)
    return { label: "正在加载", spinning: false, hint: "", error: false };
  if (!music.playing) return { label: "已暂停", spinning: false, hint: "", error: false };
  if (music.duration <= 0 && music.position <= 0)
    return {
      label: "等待音频",
      spinning: false,
      error: false,
      hint: "尚未获取到音频时长或播放进度。若持续不出声，请重新搜索点播或更换音源；封面和歌词可独立加载。",
    };
  return { label: "正在播放", spinning: true, hint: "", error: false };
}

export function reportedPlayerState(song: unknown): number | null {
  const value = object(song).state;
  if ((typeof value !== "number" && typeof value !== "string") || String(value).trim() === "")
    return null;
  const state = numeric(value, -1);
  return [0, 1, 2, 3, 4, 5, 6, 7, 10].includes(state) ? state : null;
}

// This is device audio-resolution telemetry, not the independent cover/lyrics API.
export function audioSourceError(info: unknown): string {
  const song = object(object(info).music_info);
  const data = object(song.Current_MusicData);
  if (data.id && song.id && String(data.id) !== String(song.id)) return "";
  const api = object(data.api_data);
  if (api.code === undefined || api.code === null || api.code === "") return "";
  const code = numeric(api.code, NaN);
  if (!Number.isFinite(code) || code === 1) return "";
  const message =
    typeof api.msg === "string" ? api.msg : typeof api.message === "string" ? api.message : "";
  return `音源接口返回 ${code}${message ? `：${message.slice(0, 180)}` : ""}`;
}
