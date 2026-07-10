import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "../../db";
import { aiUsageEvent } from "../../db/schema";
import { evaluateRateLimit } from "../rate-limit/window";
import { RateLimitExceededError } from "./errors";
import type { OrgContext } from "./org-context";

export type AiUsageFeature = "fill_profile" | "assistant_message";

/**
 * Checks the caller's trailing-window usage for one AI feature and, if it
 * fits under the limit, records this call. Throws RateLimitExceededError
 * otherwise. Org+feature checks are serialized with an advisory lock so
 * concurrent requests from the same organization can't both slip through
 * the same window.
 */
export async function checkAndRecordAiUsage(
  ctx: OrgContext,
  params: { feature: AiUsageFeature; cost: number; now: Date; limit: number; windowMs: number },
): Promise<void> {
  const { feature, cost, now, limit, windowMs } = params;
  const windowStart = new Date(now.getTime() - windowMs);
  const lockKey = `${ctx.organizationId}:${feature}`;

  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`);

    const events = await tx
      .select({ amount: aiUsageEvent.amount, occurredAt: aiUsageEvent.occurredAt })
      .from(aiUsageEvent)
      .where(
        and(
          eq(aiUsageEvent.organizationId, ctx.organizationId),
          eq(aiUsageEvent.feature, feature),
          gt(aiUsageEvent.occurredAt, windowStart),
        ),
      );

    const decision = evaluateRateLimit({ events, now, windowMs, limit, cost });
    if (!decision.allowed) throw new RateLimitExceededError(decision.retryAfterMs);

    await tx.insert(aiUsageEvent).values({
      organizationId: ctx.organizationId,
      feature,
      amount: cost,
      occurredAt: now,
    });
  });
}
