import { formatEurCompact } from "@/lib/format";

/**
 * Contextual IPO assistant: answers process questions and reads the
 * company's readiness data to give tailored guidance. Advice framing only —
 * never investment advice, never a substitute for the deterministic engines.
 */

export interface AssistantCompanyContext {
  name: string;
  sector: string;
  globalScore?: number;
  categoryScores?: Record<string, number>;
  weaknesses?: string[];
  topActions?: string[];
  valuationRange?: { low: number; high: number };
}

/** Pure system-prompt builder (unit-tested). */
export function buildAssistantSystemPrompt(context?: AssistantCompanyContext): string {
  const lines = [
    "You are the IPO Compass assistant, a specialist in IPO readiness for",
    "French SMEs (Euronext Paris: Growth and Access segments).",
    "You explain the IPO process, regulatory requirements (AMF, prospectus,",
    "audits, governance), financial concepts, and how to improve readiness.",
    "",
    "Rules:",
    "- Educational guidance only — this is not investment advice and you must",
    "  say so when asked to value, buy, sell, or time the market.",
    "- Be concrete and practical; answer in the language the user writes in.",
    "- Scores, valuations and roadmaps come from IPO Compass's deterministic",
    "  engines; you may interpret them but never invent or recompute figures.",
    "- If a question needs a lawyer, auditor or banker, say which specialist.",
  ];

  if (context) {
    lines.push("", `Company in context: ${context.name} (${context.sector}).`);
    if (context.globalScore !== undefined) {
      lines.push(`IPO readiness score: ${context.globalScore}%.`);
    }
    if (context.categoryScores && Object.keys(context.categoryScores).length > 0) {
      lines.push(
        `Category scores: ${Object.entries(context.categoryScores)
          .map(([id, score]) => `${id} ${score}%`)
          .join(", ")}.`,
      );
    }
    if (context.weaknesses?.length) {
      lines.push(`Weak categories: ${context.weaknesses.join(", ")}.`);
    }
    if (context.topActions?.length) {
      lines.push(`Top priority actions: ${context.topActions.join("; ")}.`);
    }
    if (context.valuationRange) {
      lines.push(
        `Latest valuation range: ${formatEurCompact(context.valuationRange.low)} to ${formatEurCompact(context.valuationRange.high)}.`,
      );
    }
  }

  return lines.join("\n");
}
