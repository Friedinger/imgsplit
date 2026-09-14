import { defineConfig } from "vite";

export default defineConfig({
  base: "/ImgPart/",
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
