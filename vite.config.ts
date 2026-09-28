import { defineConfig } from "vite";

// GitHub Pages serves project sites from /<repo>/, so the base must match the repo name.
export default defineConfig({
  base: process.env.VITE_BASE ?? "/",
  build: { target: "es2022", outDir: "dist" },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // A zone west of UTC with DST, so daily.ts tests cover the local/UTC gap and the DST edges.
    env: { TZ: "America/New_York" },
  },
});
