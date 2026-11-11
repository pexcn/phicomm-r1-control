import { cpSync, copyFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const destination = path.join(root, "dist");
if (!existsSync(path.join(destination, "index.html"))) {
  throw new Error("Build the independent frontend before preparing the site.");
}
cpSync(path.join(root, "upstream"), path.join(destination, "upstream"), { recursive: true });
for (const file of ["favicon.svg", "new_r1_control.js", "LICENSE"]) {
  copyFileSync(path.join(root, file), path.join(destination, file));
}
console.log("Prepared dist/: independent frontend and upstream reference.");
