import { z } from "zod";
import { buildAssistantSystemPrompt } from "@/lib/ai/assistant";
import { AI_MODEL, getAnthropicClient, isAiConfigured } from "@/lib/ai/config";
import { AI_RATE_LIMITS } from "@/lib/ai/rate-limit-config";
import { getAssistantCompanyContext } from "@/lib/data-access/assistant-context";
import { requireOrgContext } from "@/lib/data-access/context";
import {
  NotFoundError,
  RateLimitExceededError,
  UnauthenticatedError,
} from "@/lib/data-access/errors";
import { checkAndRecordAiUsage } from "@/lib/data-access/rate-limit";

const bodySchema = z.object({
  companyId: z.string().min(1).max(64).optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(24),
});

export async function POST(request: Request) {
  let ctx;
  try {
    ctx = await requireOrgContext();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }
    return Response.json({ error: "No active organization" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Cost = number of user turns in this request, not a flat 1 per HTTP call —
  // otherwise one oversized request could smuggle a whole long chat past the limit.
  const cost = Math.max(1, parsed.data.messages.filter((m) => m.role === "user").length);
  try {
    await checkAndRecordAiUsage(ctx, {
      feature: "assistant_message",
      cost,
      now: new Date(),
      ...AI_RATE_LIMITS.assistantMessage,
    });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      const retryAfterSeconds = Math.ceil(error.retryAfterMs / 1000);
      return Response.json(
        { error: "Your organization has reached its daily assistant message limit." },
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
      );
    }
    throw error;
  }

  if (!isAiConfigured()) {
    return Response.json(
      { error: "AI assistant is not configured — set ANTHROPIC_API_KEY." },
      { status: 503 },
    );
  }

  let system: string;
  try {
    system = buildAssistantSystemPrompt(
      parsed.data.companyId
        ? await getAssistantCompanyContext(ctx, parsed.data.companyId)
        : undefined,
    );
  } catch (error) {
    if (error instanceof NotFoundError) {
      return Response.json({ error: "Company not found" }, { status: 404 });
    }
    throw error;
  }

  const client = getAnthropicClient();
  const stream = client.messages.stream({
    model: AI_MODEL,
    max_tokens: 2048,
    system,
    messages: parsed.data.messages,
  });

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      stream.on("text", (delta) => controller.enqueue(encoder.encode(delta)));
      stream.on("error", (error) => controller.error(error));
      stream.on("end", () => controller.close());
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
