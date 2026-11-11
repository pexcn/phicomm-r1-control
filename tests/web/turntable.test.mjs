import assert from "node:assert/strict";
import { test } from "node:test";
import { parkedTonearmAngle, tonearmAngle } from "../../src/lib/turntable.ts";

// Forward kinematics from the actual image's hinge and stylus coordinates.
function stylusRadius(angle) {
  const radians = (angle * Math.PI) / 180;
  const x = 133 + 55 / 3 + (200 / 3) * Math.cos(radians) - (340 / 3) * Math.sin(radians);
  const y = -70 + 42 / 3 + (200 / 3) * Math.sin(radians) + (340 / 3) * Math.cos(radians);
  return Math.hypot(x - 148, y - 148);
}

test("the stylus travels inward on the black grooves and parks outside the record", () => {
  let previous = Infinity;
  for (let position = 0; position <= 100; position++) {
    const radius = stylusRadius(tonearmAngle(position, 100));
    assert.ok(radius <= previous + 1e-9);
    assert.ok(radius >= 108 - 1e-9 && radius <= 132 + 1e-9);
    previous = radius;
  }
  assert.ok(Math.abs(stylusRadius(tonearmAngle(0, 100)) - 132) < 1e-9);
  assert.ok(Math.abs(stylusRadius(tonearmAngle(100, 100)) - 108) < 1e-9);
  assert.ok(stylusRadius(parkedTonearmAngle) > 148);
});

test("unknown and out-of-range progress cannot move the stylus off its playable arc", () => {
  const start = tonearmAngle(0, 100);
  const end = tonearmAngle(100, 100);
  for (const [position, duration] of [
    [-20, 100],
    [0, 0],
    [50, -1],
    [NaN, 100],
    [Infinity, 100],
    [50, NaN],
  ]) {
    assert.equal(tonearmAngle(position, duration), start);
  }
  assert.equal(tonearmAngle(200, 100), end);
});
