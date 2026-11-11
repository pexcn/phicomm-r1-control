import assert from "node:assert/strict";
import { test } from "node:test";
import { colorSchemes } from "../../src/lib/color-schemes.ts";

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

test("every preset provides valid colors and readable text in both appearance modes", () => {
  assert.equal(new Set(colorSchemes.map((scheme) => scheme.id)).size, colorSchemes.length);
  const pairs = [
    ["--text", "--bg"],
    ["--muted", "--surface"],
    ["--on-accent", "--accent"],
    ["--md-sys-color-on-primary-container", "--md-sys-color-primary-container"],
    ["--md-sys-color-on-secondary", "--md-sys-color-secondary"],
    ["--md-sys-color-on-secondary-container", "--soft"],
    ["--md-sys-color-on-error", "--danger"],
  ];
  for (const scheme of colorSchemes) {
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
});
