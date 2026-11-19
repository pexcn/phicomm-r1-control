import assert from "node:assert/strict";
import { test } from "node:test";
import {
  searchPlayback,
  playbackPresentation,
  reportedPlayerState,
  audioSourceError,
} from "../../src/lib/music-playback.ts";

const song = { id: "661836412,kuwo", title: "Song of Wings", artist: "PROJECT ACES", cover: "" };
test("anonymous play and append always include a speaker audio URL", () => {
  for (const append of [false, true]) {
    const message = searchPlayback(song, append, new URL("https://r1.wxfsq.com/music"));
    assert.equal(message.arg1, append ? 19 : 15);
    const payload = JSON.parse(message.obj);
    assert.equal(payload.curItemId, song.id);
    assert.equal(payload.itemList[0].itemId, song.id);
    assert.equal(payload.itemList[0].url, "http://r1.wxfsq.com/music?url=661836412%2Ckuwo");
    assert.equal(payload.itemList[0].itemType, 0);
  }
});

test("custom music endpoints retain their transport, path and query", () => {
  for (const endpoint of [
    "https://audio.example/api?token=a%2Fb",
    "https://r1.wxfsq.com/music?token=a%2Fb",
    "https://r1.wxfsq.com:8443/music",
  ]) {
    const item = JSON.parse(searchPlayback(song, false, new URL(endpoint)).obj).itemList[0];
    const url = new URL(item.url),
      original = new URL(endpoint);
    assert.equal(url.origin, original.origin);
    assert.equal(url.pathname, original.pathname);
    assert.equal(url.searchParams.get("token"), original.searchParams.get("token"));
    assert.equal(url.searchParams.get("url"), song.id);
  }
  assert.throws(() => searchPlayback({ ...song, id: "" }, false, new URL("https://audio.example")));
  assert.throws(() => searchPlayback(song, false, new URL("https://user:pass@audio.example")));
});

test("device loading and failure states override play-when-ready and metadata", () => {
  const base = { title: song.title, playing: true, position: 0, duration: 0, playerState: null };
  for (const [state, label] of [
    [0, "已停止"],
    [2, "已暂停"],
    [3, "正在加载"],
    [4, "播放失败"],
    [5, "已播放完"],
    [6, "正在缓冲"],
    [10, "正在加载"],
  ]) {
    const view = playbackPresentation({ ...base, playerState: state });
    assert.equal(view.label, label);
    assert.equal(view.spinning, false);
  }
  assert.equal(playbackPresentation({ ...base, playing: false, playerState: 3 }).label, "正在加载");
  assert.equal(playbackPresentation(base).label, "等待音频");
  assert.equal(playbackPresentation({ ...base, position: 5000 }).spinning, true); // Live audio can lack duration.
  assert.equal(playbackPresentation({ ...base, duration: 120000, playerState: 1 }).spinning, true);
  assert.equal(playbackPresentation({ ...base, duration: 120000, playing: false }).label, "已暂停");
  assert.equal(reportedPlayerState(JSON.stringify({ state: "4" })), 4);
  for (const value of [undefined, null, "", " ", true, false, 99])
    assert.equal(reportedPlayerState({ state: value }), null);
});

test("audio resolution errors are shown without confusing stale metadata", () => {
  const data = { id: "track-1", api_data: { code: -1, msg: "登录状态已过期" } };
  const info = { music_info: { id: "track-1", Current_MusicData: JSON.stringify(data) } };
  assert.equal(audioSourceError(info), "音源接口返回 -1：登录状态已过期");
  assert.equal(audioSourceError({ music_info: { id: "track-2", Current_MusicData: data } }), "");
  assert.equal(
    audioSourceError({ music_info: { Current_MusicData: { api_data: { code: 1 } } } }),
    "",
  );
  assert.equal(audioSourceError({}), "");
});
