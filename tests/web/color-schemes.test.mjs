import assert from "node:assert/strict";
import { test } from "node:test";
import { colorSchemes } from "../../src/lib/color-schemes.ts";
import { createCustomColorScheme, normalizeCustomColor } from "../../src/lib/custom-color.ts";

function color(palette, name, seen = new Set()) {
  assert.ok(!seen.has(name), `Cyclic color reference: ${name}`);
  seen.add(name);
  const value = palette[name];
  const alias = /^var\((--[\w-]+)\)$/.exec(value);
  if (alias) return color(palette, alias[1], seen);
  assert.match(value, /^#[\da-f]{3}(?:[\da-f]{3})?$/i, `Invalid color: ${name}`);
  return value.length === 4
    ? "#" + [...value.slice(1)].map((digit) => digit.repeat(2)).join("")
    : value;
}

function luminance(hex) {
  return [0.2126, 0.7152, 0.0722].reduce((sum, weight, index) => {
    const channel = parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255;
    return (
      sum + weight * (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    );
  }, 0);
}

function assertReadable(scheme) {
  const pairs = [
    ["--text", "--bg"],
    ["--muted", "--surface"],
    ["--on-accent", "--accent"],
    ["--md-sys-color-on-primary-container", "--md-sys-color-primary-container"],
    ["--md-sys-color-on-secondary", "--md-sys-color-secondary"],
    ["--md-sys-color-on-secondary-container", "--soft"],
    ["--md-sys-color-on-error", "--danger"],
  ];
  for (const mode of ["light", "dark"]) {
    const palette = scheme[mode];
    for (const key of Object.keys(palette)) color(palette, key);
    for (const [foreground, background] of pairs) {
      const levels = [foreground, background]
        .map((key) => luminance(color(palette, key)))
        .sort((a, b) => b - a);
      assert.ok(
        (levels[0] + 0.05) / (levels[1] + 0.05) >= 4.5,
        `${scheme.id}/${mode}: ${foreground} on ${background}`,
      );
    }
  }
}

test("every preset provides valid colors and readable text in both appearance modes", () => {
  assert.equal(new Set(colorSchemes.map((scheme) => scheme.id)).size, colorSchemes.length);
  for (const scheme of colorSchemes) assertReadable(scheme);
});

test("custom colors reject malformed input before reaching the color algorithm", () => {
  assert.equal(normalizeCustomColor("  #AABBcc "), "#aabbcc");
  for (const value of [null, {}, 123, "#fff", "red", "#12345678", "#gggggg", "123456"]) {
    assert.equal(normalizeCustomColor(value), null);
    assert.throws(() => createCustomColorScheme(value));
  }
});

test("custom palettes keep readable contrast for grayscale and saturated RGB colors", () => {
  for (const red of [0, 128, 255]) {
    for (const green of [0, 128, 255]) {
      for (const blue of [0, 128, 255]) {
        const seed = "#" + [red, green, blue].map((v) => v.toString(16).padStart(2, "0")).join("");
        const scheme = createCustomColorScheme(seed);
        for (const mode of ["light", "dark"]) {
          assert.deepEqual(
            Object.keys(scheme[mode]).sort(),
            Object.keys(colorSchemes[0][mode]).sort(),
          );
        }
        assertReadable(scheme);
      }
    }
  }
});
