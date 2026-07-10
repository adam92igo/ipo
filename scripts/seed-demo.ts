import fs from "node:fs";

if (fs.existsSync(".env")) {
  process.loadEnvFile(".env");
}
if (!process.env.DEMO_DATABASE_URL) {
  throw new Error("DEMO_DATABASE_URL is not set (see .env.example)");
}
for (const envVar of ["DEMO_ACCOUNT_EMAIL_READY", "DEMO_ACCOUNT_EMAIL_MID", "DEMO_ACCOUNT_EMAIL_EARLY"]) {
  if (!process.env[envVar]) {
    throw new Error(
      `${envVar} is not set (see .env.example) — sign up in the demo environment ` +
        "first (see README, section 'Demo environment').",
    );
  }
}

// src/db/index.ts reads DATABASE_URL at import time, so this must be set
// before the run script (and anything it imports) is loaded.
process.env.DATABASE_URL = process.env.DEMO_DATABASE_URL;

void (async () => {
  await import("./seed-demo-run");
})();
