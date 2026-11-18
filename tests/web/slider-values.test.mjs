import assert from "node:assert/strict";
import { test } from "node:test";
import { sliderPercent, sliderDecibels } from "../../src/lib/slider-values.ts";

test("slider labels format display units without changing device values", () => {
  assert.equal(sliderPercent(10, 30), "33%");
  assert.equal(sliderPercent(0, 30), "0%");
  assert.equal(sliderPercent(30, 30), "100%");
  assert.equal(sliderPercent(200), "200%"); // Brightness is already a percentage.
  assert.equal(sliderPercent(NaN), "—");
  assert.equal(sliderPercent(1, 0), "—");
  assert.equal(sliderDecibels(350 / 100), "+3.5 dB");
  assert.equal(sliderDecibels(-1200 / 100), "-12.0 dB");
  assert.equal(sliderDecibels(237 - 231), "+6.0 dB");
  assert.equal(sliderDecibels(-0.01), "0.0 dB");
});
