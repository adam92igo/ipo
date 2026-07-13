import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";

/**
 * Model for the AI modules ONLY (module 5) — never used by the deterministic
 * engines. claude-sonnet per the project brief; override with AI_MODEL.
 */
export const AI_MODEL = process.env.AI_MODEL ?? "claude-sonnet-5";
export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

export type AiProvider = "anthropic" | "gemini";
type AiProviderSetting = AiProvider | "auto";

export class AiNotConfiguredError extends Error {
  constructor() {
    super(getAiSetupMessage());
    this.name = "AiNotConfiguredError";
  }
}

function getProviderSetting(): AiProviderSetting {
  const raw = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (raw === "anthropic" || raw === "gemini" || raw === "auto") return raw;
  return "auto";
}

function hasAnthropicKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function hasGeminiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export function getAiProvider(): AiProvider | null {
  const setting = getProviderSetting();
  if (setting === "anthropic") return hasAnthropicKey() ? "anthropic" : null;
  if (setting === "gemini") return hasGeminiKey() ? "gemini" : null;
  if (hasAnthropicKey()) return "anthropic";
  if (hasGeminiKey()) return "gemini";
  return null;
}

export function getAiSetupMessage(): string {
  const setting = getProviderSetting();
  if (setting === "anthropic") {
    return "AI features are not configured — set ANTHROPIC_API_KEY in .env";
  }
  if (setting === "gemini") {
    return "AI features are not configured — set GEMINI_API_KEY in .env";
  }
  return "AI features are not configured — set ANTHROPIC_API_KEY or GEMINI_API_KEY in .env";
}

export function isAiConfigured(): boolean {
  return getAiProvider() !== null;
}

export function isPappersConfigured(): boolean {
  return Boolean(process.env.PAPPERS_API_KEY);
}

let anthropicClient: Anthropic | null = null;
let geminiClient: GoogleGenAI | null = null;

export function getAnthropicClient(): Anthropic {
  if (!hasAnthropicKey()) throw new AiNotConfiguredError();
  anthropicClient ??= new Anthropic();
  return anthropicClient;
}

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AiNotConfiguredError();
  geminiClient ??= new GoogleGenAI({ apiKey });
  return geminiClient;
}
