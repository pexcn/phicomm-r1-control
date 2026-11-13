import assert from "node:assert/strict";
import { test } from "node:test";
import { audioEffectMessage, mixerMessage, parseDspState } from "../../src/lib/audio-effects.ts";

test("advanced audio values keep device units and reject invalid or unsupported writes", () => {
  assert.deepEqual(audioEffectMessage("bass", null, 650), {
    type: "set_bass_strength",
    strength: 650,
  });
  assert.deepEqual(audioEffectMessage("loudness", null, -1200), {
    type: "set_loudness_gain",
    gain: -1200,
  });
  for (const value of [NaN, Infinity, 1001, -1, 12.5])
    assert.throws(() => audioEffectMessage("bass", null, value));
  assert.throws(() => mixerMessage(1873, "L", 231));
  assert.throws(() => mixerMessage(1887, "L", 252));
  assert.deepEqual(mixerMessage(1887, "R", 237), {
    type: "setMixerValue",
    controlName: "DAC Digital Volume R",
    value: 237,
  });
});

test("DSP parsing distinguishes requested mode, hardware readback, and missing state", () => {
  assert.equal(
    parseDspState("echo route0feture: $(getprop persist.route0feture)\r\nroute0feture: \r\npram:"),
    null,
  );
  assert.deepEqual(parseDspState("route0feture: 1\r\npram: >data3"), {
    enabled: true,
    active: true,
  });
  assert.deepEqual(parseDspState("route0feture: 0\r\npram:"), { enabled: false, active: null });
});
