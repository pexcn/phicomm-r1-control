import { copyFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const destination = path.join(root, "dist");
if (!existsSync(path.join(destination, "index.html"))) {
  throw new Error("Build the independent frontend before preparing the site.");
}
execFileSync("python3", [path.join(root, "upstream/sync.py"), "build"], { stdio: "inherit" });
copyFileSync(path.join(root, "LICENSE"), path.join(destination, "LICENSE"));
console.log("Prepared dist/: independent frontend and upstream reference.");
