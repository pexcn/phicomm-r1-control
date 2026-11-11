import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const missing = [];
let referenceCount = 0;

function filesIn(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    return entry.isDirectory() ? filesIn(filePath) : [filePath];
  });
}

function checkReference(value, owner, base = path.dirname(owner)) {
  if (!value || /^(?:[a-z]+:|\/\/|#|data:)/i.test(value)) return;
  const pathname = decodeURIComponent(value.split(/[?#]/)[0]);
  if (!pathname) return;
  const target = pathname.startsWith("/")
    ? path.join(root, pathname)
    : path.resolve(base, pathname);
  referenceCount += 1;
  if (!existsSync(target)) missing.push(`${path.relative(root, owner)}: ${value}`);
}

const files = ["index.html", "new_r1_control.js", "service-worker.js"]
  .map((file) => path.join(root, file))
  .concat(
    filesIn(path.join(root, "pages")),
    filesIn(path.join(root, "assets")),
    filesIn(path.join(root, "upstream")),
  )
  .filter((file) => !file.includes(`${path.sep}vendor${path.sep}`));

for (const file of files) {
  const source = readFileSync(file, "utf8");
  if (file.endsWith(".html")) {
    for (const match of source.matchAll(
      /<(?:script|link|img)\b[^>]*?\b(?:src|href)=["']([^"']+)["']/gi,
    )) {
      checkReference(match[1], file);
    }
  }
  if (file.endsWith(".css")) {
    for (const match of source.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/g)) {
      checkReference(match[1], file);
    }
  }
  if (file.endsWith(".js")) {
    for (const match of source.matchAll(/R1Upstream\.assetUrl\(["']([^"']+)["']/g)) {
      checkReference(match[1], file, path.join(root, "upstream"));
    }
    for (const match of source.matchAll(/R1Config\.assetUrl\(["']([^"']+)["']/g)) {
      checkReference(match[1], file, root);
    }
    for (const match of source.matchAll(/["']((?:\.\.\/)*(?:assets|pages)\/[^"']+)["']/g)) {
      const reference = match[1].replace(/^(?:\.\.\/)+/, "");
      checkReference(reference, file, root);
    }
  }
}

const manifestPath = path.join(root, "site.webmanifest");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
for (const icon of manifest.icons) checkReference(icon.src, manifestPath);
checkReference(manifest.start_url, manifestPath);
for (const directory of ["modern", "wifi", "adb", "dlna", "mdns", "device-scan"]) {
  assert.ok(statSync(path.join(root, "pages", directory, "index.html")).isFile());
}
assert.deepEqual(missing, [], `Missing local resources:\n${missing.join("\n")}`);
console.log(`Checked ${referenceCount} local resource references.`);
