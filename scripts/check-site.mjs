import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const temporary = mkdtempSync(path.join(tmpdir(), "r1-site-check-"));
const upstream = path.join(temporary, "upstream");

function filesIn(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(directory, entry.name);
    return entry.isDirectory() ? filesIn(filename) : [filename];
  });
}

try {
  // Validate deployable bytes without creating or depending on a dist/ build.
  execFileSync("python3", [path.join(root, "upstream/sync.py"), "build", "--output", upstream], {
    stdio: "inherit",
  });
  const missing = [];
  let references = 0;
  let scripts = 0;
  function label(filename) {
    return filename.startsWith(upstream + path.sep)
      ? "upstream/" + path.relative(upstream, filename)
      : path.relative(root, filename);
  }
  function checkReference(value, owner, base = path.dirname(owner)) {
    if (!value || /^(?:[a-z]+:|\/\/|#|data:)/i.test(value)) return;
    const pathname = decodeURIComponent(value.split(/[?#]/)[0]);
    if (!pathname) return;
    let target;
    if (pathname.startsWith("/upstream/")) target = path.join(temporary, pathname);
    else if (pathname.startsWith("/")) {
      target = path.join(root, pathname);
      if (!existsSync(target)) target = path.join(root, "public", pathname);
    } else target = path.resolve(base, pathname);
    references++;
    if (!existsSync(target)) missing.push(`${label(owner)}: ${value}`);
  }
  function checkScript(source, filename) {
    const result = spawnSync(process.execPath, ["--check"], { input: source, encoding: "utf8" });
    assert.equal(result.status, 0, `${label(filename)}:\n${result.stderr}`);
    scripts++;
  }
  const files = [
    path.join(root, "index.html"),
    path.join(root, "public/new_r1_control.js"),
    ...filesIn(upstream),
  ];
  for (const filename of files) {
    if (!/\.(html|css|js)$/.test(filename)) continue;
    const source = readFileSync(filename, "utf8");
    if (filename.endsWith(".js")) checkScript(source, filename);
    if (filename.includes(`${path.sep}vendor${path.sep}`)) continue;
    if (filename.endsWith(".html")) {
      for (const match of source.matchAll(
        /<(?:script|link|img)\b[^>]*?\b(?:src|href)=["']([^"']+)["']/gi,
      )) {
        checkReference(match[1], filename);
      }
      for (const match of source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
        if (match[1].trim()) checkScript(match[1], filename);
      }
    }
    if (filename.endsWith(".css")) {
      for (const match of source.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/g))
        checkReference(match[1], filename);
    }
    if (filename.endsWith(".js")) {
      for (const match of source.matchAll(/R1Upstream\.assetUrl\(["']([^"']+)["']/g))
        checkReference(match[1], filename, upstream);
      for (const match of source.matchAll(/["'](upstream\/[^"']+)["']/g))
        checkReference("/" + match[1], filename);
    }
  }
  const manifestPath = path.join(upstream, "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  for (const icon of manifest.icons) checkReference(icon.src, manifestPath);
  checkReference(manifest.start_url, manifestPath);
  for (const directory of ["newui", "config_wifi", "adb"])
    assert.ok(statSync(path.join(upstream, directory, "index.html")).isFile());
  assert.deepEqual(missing, [], `Missing local resources:\n${missing.join("\n")}`);
  console.log(`Checked ${references} local resource references and ${scripts} browser scripts.`);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
