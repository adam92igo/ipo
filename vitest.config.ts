import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    setupFiles: ["./src/test/setup.ts"],
    // Integration tests share one test database — no parallel file execution.
    fileParallelism: false,
    // e2e/ holds Playwright specs, run via `pnpm test:e2e`, not Vitest —
    // added on top of Vitest's own defaults (specifying `exclude` replaces them).
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/cypress/**",
      "**/.{idea,git,cache,output,temp}/**",
      "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
      "./e2e/**",
    ],
  },
});
