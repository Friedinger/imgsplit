import { defineConfig } from "vite";

export default defineConfig({
  base: "/imgsplit/",
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
  },
});
