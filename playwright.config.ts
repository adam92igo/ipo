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
  timeout: 60_000,
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
