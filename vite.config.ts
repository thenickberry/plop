import { defineConfig } from "vite";

// GitHub Pages serves project sites from /<repo>/, so the base must match the repo name.
export default defineConfig({
  base: process.env.VITE_BASE ?? "/",
  build: { target: "es2022", outDir: "dist" },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
