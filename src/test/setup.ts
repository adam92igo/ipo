import fs from "node:fs";

// Tests must never touch the dev database: point DATABASE_URL at the test DB
// before any module under test creates its connection pool.
if (fs.existsSync(".env")) {
  process.loadEnvFile(".env");
}

if (!process.env.TEST_DATABASE_URL) {
  throw new Error("TEST_DATABASE_URL is not set (see .env.example)");
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
