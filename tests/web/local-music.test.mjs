import assert from "node:assert/strict";
import { test } from "node:test";
import {
  localPath,
  parseLocalMusic,
  playLocalPath,
  scanLocalMusic,
  supportsLocalMusic,
} from "../../src/lib/local-music.ts";

test("local scans quote paths and reject invalid or escaped directory results", () => {
  for (const path of ["relative", "/sdcard/../data", "/sdcard/\nMusic"])
    assert.throws(() => localPath(path));
  const command = scanLocalMusic("/sdcard/it's $(touch bad)").shell;
  assert.ok(command.includes("'/sdcard/it'\\''s $(touch bad)'"));
  const result = parseLocalMusic(
    "echo __R1_LOCAL_BEGIN__\n__R1_LOCAL_BEGIN__\n/sdcard/Music/a.mp3\n/elsewhere/secret.mp3\n/sdcard/Music/note.txt\n/sdcard/Music/a.mp3\n__R1_LOCAL_END__",
    "/sdcard/Music",
  );
  assert.deepEqual(result, { files: ["/sdcard/Music/a.mp3"], truncated: false });
  assert.throws(() => parseLocalMusic("__R1_LOCAL_ERROR__", "/sdcard/Music"));
});

test("local file playback uses a direct device URL without Unisound or search capabilities", () => {
  assert.equal(supportsLocalMusic(1873, 2), true);
  assert.equal(supportsLocalMusic(null, 2), false);
  assert.equal(supportsLocalMusic(1860, 2), false);
  const message = playLocalPath("/sdcard/Music/夜航.mp3");
  assert.equal(message.what, 4);
  assert.equal(message.arg1, 15);
  const item = JSON.parse(message.obj).itemList[0];
  assert.equal(item.url, "/sdcard/Music/夜航.mp3");
  assert.ok(item.itemId.startsWith("local_"));
  assert.deepEqual(playLocalPath("/sdcard/Music/"), {
    type: "play_local_music",
    path: "/sdcard/Music",
    play: true,
  });
});
