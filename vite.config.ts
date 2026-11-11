import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  root: "src",
  base: "./",
  publicDir: false,
  plugins: [
    vue({ template: { compilerOptions: { isCustomElement: (tag) => tag.startsWith("md-") } } }),
  ],
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    assetsDir: "_app",
    license: { fileName: "THIRD-PARTY-LICENSES.md" },
  },
  server: { host: "0.0.0.0" },
});
