import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { execFileSync } from "node:child_process";
import path from "node:path";

export default defineConfig({
  base: "./",
  plugins: [
    vue({ template: { compilerOptions: { isCustomElement: (tag) => tag.startsWith("md-") } } }),
    {
      name: "upstream-reference",
      configureServer(server) {
        execFileSync("python3", [path.join(server.config.root, "upstream/sync.py"), "build"], {
          stdio: "inherit",
        });
        server.middlewares.use((request, _response, next) => {
          if (request.url?.startsWith("/upstream/")) request.url = "/dist" + request.url;
          next();
        });
      },
    },
  ],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    assetsDir: "_app",
    license: { fileName: "THIRD-PARTY-LICENSES.md" },
  },
  server: { host: "0.0.0.0" },
});
