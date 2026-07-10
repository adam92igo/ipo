import fs from "node:fs";
import { defineConfig, devices } from "@playwright/test";

if (fs.existsSync(".env")) {
  process.loadEnvFile(".env");
}
if (!process.env.TEST_DATABASE_URL) {
  throw new Error("TEST_DATABASE_URL is not set (see .env.example)");
}

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  // The full journey hits ~15 distinct routes; on a CI runner every one of
  // them is a cold Turbopack compile (several seconds each, stacking up),
  // whereas locally the dev server is already warm from prior runs.
  timeout: 120_000,
  // Default expect() timeout (5s) is too tight for a cold `next dev
  // --turbopack` compile on a first-hit route in CI — each first navigation
  // to a not-yet-compiled route can itself take several seconds.
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `next dev --turbopack -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      // The E2E server runs against the test database, never the dev one,
      // and AI keys are forced empty so the assistant page renders in its
      // degraded, no-network mode regardless of the developer's own .env.
      DATABASE_URL: process.env.TEST_DATABASE_URL,
      BETTER_AUTH_URL: `http://localhost:${PORT}`,
      ANTHROPIC_API_KEY: "",
      PAPPERS_API_KEY: "",
    },
  },
});
