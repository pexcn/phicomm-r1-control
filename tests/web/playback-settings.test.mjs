import assert from "node:assert/strict";
import { test } from "node:test";
import { audioDetails } from "../../src/lib/playback-settings.ts";

test("audio metadata handles encoded payloads without guessing lossless quality", () => {
  const rows = audioDetails({
    music_info: {
      Current_MusicData: JSON.stringify({
        api_data: { br: 990000, quality: "无损" },
        Format: { sampleMimeType: "audio/flac", sampleRate: 96000, pcmEncoding: 536870912 },
      }),
    },
  });
  assert.deepEqual(rows, [
    ["实际音质", "无损"],
    ["格式", "audio/flac"],
    ["码率", "990 kbps"],
    ["采样率", "96 kHz"],
    ["解码位深", "24 bit"],
  ]);
  assert.deepEqual(audioDetails({}), []);
  assert.deepEqual(
    audioDetails({ music_info: { Current_MusicData: { Format: { bitrate: 500000 } } } }),
    [["码率", "500 kbps"]],
  );
});
