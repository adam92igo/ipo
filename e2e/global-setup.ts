import fs from "node:fs";

/**
 * Points the (test-runner-process) db connection at TEST_DATABASE_URL and
 * resets it to a clean, migrated state before the webServer (a separate
 * process, configured the same way in playwright.config.ts) starts serving
 * requests against it.
 */
export default async function globalSetup(): Promise<void> {
  if (fs.existsSync(".env")) {
    process.loadEnvFile(".env");
  }
  if (!process.env.TEST_DATABASE_URL) {
    throw new Error("TEST_DATABASE_URL is not set (see .env.example)");
  }
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

  const { migrateTestDb, truncateAll } = await import("../src/test/db");
  await migrateTestDb();
  await truncateAll();
}
