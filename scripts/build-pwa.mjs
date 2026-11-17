import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const templatePath = fileURLToPath(new URL("service-worker.js", import.meta.url));
function filesIn(root, directory) {
  return readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap((entry) => {
    const filename = path.posix.join(directory, entry.name);
    return entry.isDirectory() ? filesIn(root, filename) : [filename];
  });
}

export function buildPwa(destination) {
  const assets = [
    "index.html",
    "site.webmanifest",
    "favicon.svg",
    ...filesIn(destination, "icons"),
    ...filesIn(destination, "_app"),
  ].sort();
  const template = readFileSync(templatePath, "utf8");
  const hash = createHash("sha256").update(template);
  const precache = assets.map((asset) => {
    const bytes = readFileSync(path.join(destination, asset));
    hash.update(asset).update(bytes);
    return {
      path: asset,
      integrity: "sha256-" + createHash("sha256").update(bytes).digest("base64"),
    };
  });
  const version = hash.digest("hex").slice(0, 20);
  writeFileSync(
    path.join(destination, "service-worker.js"),
    template
      .replace("__BUILD_HASH__", version)
      .replace("/* __PRECACHE__ */ []", JSON.stringify(precache)),
  );
  console.log(`Prepared PWA: ${assets.length} app resources, version ${version}.`);
}
