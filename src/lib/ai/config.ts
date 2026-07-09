import Anthropic from "@anthropic-ai/sdk";

/**
 * Model for the AI modules ONLY (module 5) — never used by the deterministic
 * engines. claude-sonnet per the project brief; override with AI_MODEL.
 */
export const AI_MODEL = process.env.AI_MODEL ?? "claude-sonnet-5";

export class AiNotConfiguredError extends Error {
  constructor() {
    super("AI features are not configured — set ANTHROPIC_API_KEY in .env");
    this.name = "AiNotConfiguredError";
  }
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function isPappersConfigured(): boolean {
  return Boolean(process.env.PAPPERS_API_KEY);
}

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!isAiConfigured()) throw new AiNotConfiguredError();
  client ??= new Anthropic();
  return client;
}
