import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
function scriptsIn(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const filePath = path.join(directory, entry.name);
      return entry.isDirectory() ? scriptsIn(filePath) : [filePath];
    })
    .filter((file) => file.endsWith(".js"));
}

let checked = 0;
function check(source, label) {
  const result = spawnSync(process.execPath, ["--check"], { input: source, encoding: "utf8" });
  assert.equal(result.status, 0, `${label}:\n${result.stderr}`);
  checked += 1;
}
for (const file of scriptsIn(path.join(root, "assets", "js"))) {
  check(readFileSync(file, "utf8"), path.relative(root, file));
}
for (const file of scriptsIn(path.join(root, "upstream"))) {
  check(readFileSync(file, "utf8"), path.relative(root, file));
}
for (const filename of ["new_r1_control.js", "service-worker.js"]) {
  check(readFileSync(path.join(root, filename), "utf8"), filename);
}
// Wi-Fi remains a self-contained HTML5+ offline document.
const documents = [
  "pages/wifi/index.html",
  "upstream/index.html",
  "upstream/newui/index.html",
  "upstream/config_wifi/index.html",
  "upstream/adb/index.html",
  "upstream/dlna.html",
  "upstream/mdns.html",
  "upstream/device_scan.html",
];
for (const document of documents) {
  const html = readFileSync(path.join(root, document), "utf8");
  for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
    if (match[1].trim()) check(match[1], document);
  }
}
console.log(`Checked ${checked} browser scripts.`);
