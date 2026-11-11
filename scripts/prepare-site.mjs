import { cpSync, copyFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const destination = path.join(root, "dist");
if (!existsSync(path.join(destination, "index.html"))) {
  throw new Error("Build the independent frontend before preparing the site.");
}
for (const directory of ["upstream", "assets", "pages"]) {
  cpSync(path.join(root, directory), path.join(destination, directory), { recursive: true });
}
for (const file of [
  "favicon.svg",
  "new_r1_control.js",
  "site.webmanifest",
  "service-worker.js",
  "LICENSE",
]) {
  copyFileSync(path.join(root, file), path.join(destination, file));
}
copyFileSync(path.join(root, "index.html"), path.join(destination, "legacy.html"));
console.log("Prepared dist/: independent frontend, author reference and compatibility pages.");
