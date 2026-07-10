import { spawn } from "node:child_process";
import fs from "node:fs";

if (fs.existsSync(".env")) {
  process.loadEnvFile(".env");
}
if (!process.env.DEMO_DATABASE_URL) {
  throw new Error("DEMO_DATABASE_URL is not set (see .env.example)");
}

const PORT = 3200;

const child = spawn("pnpm", ["exec", "next", "dev", "--turbopack", "-p", String(PORT)], {
  stdio: "inherit",
  env: {
    ...process.env,
    DATABASE_URL: process.env.DEMO_DATABASE_URL,
    BETTER_AUTH_URL: `http://localhost:${PORT}`,
    // Generous on purpose: a live pitch (plus rehearsals) clicking "Fill with
    // AI" or the assistant repeatedly should never trip the production defaults.
    RATE_LIMIT_FILL_PROFILE_PER_HOUR: "1000",
    RATE_LIMIT_ASSISTANT_MESSAGES_PER_DAY: "1000",
  },
});

child.on("exit", (code) => process.exit(code ?? 0));
