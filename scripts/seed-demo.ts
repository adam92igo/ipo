import fs from "node:fs";

if (fs.existsSync(".env")) {
  process.loadEnvFile(".env");
}
if (!process.env.DEMO_DATABASE_URL) {
  throw new Error("DEMO_DATABASE_URL is not set (see .env.example)");
}
if (!process.env.DEMO_ACCOUNT_EMAIL) {
  throw new Error(
    "DEMO_ACCOUNT_EMAIL is not set (see .env.example) — sign up once in the demo " +
      "environment first (see README, section 'Demo environment').",
  );
}

// src/db/index.ts reads DATABASE_URL at import time, so this must be set
// before the run script (and anything it imports) is loaded.
process.env.DATABASE_URL = process.env.DEMO_DATABASE_URL;

void (async () => {
  await import("./seed-demo-run");
})();
