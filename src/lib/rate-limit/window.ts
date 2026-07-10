export interface UsageEvent {
  amount: number;
  occurredAt: Date;
}

export interface RateLimitDecision {
  allowed: boolean;
  used: number;
  limit: number;
  retryAfterMs: number;
}

/**
 * Sliding-window check: sums event amounts within the trailing `windowMs`
 * and decides whether `cost` more would fit under `limit`. Pure and
 * deterministic — callers pass `now` explicitly so this stays unit-testable
 * without a real clock or database.
 */
export function evaluateRateLimit(params: {
  events: UsageEvent[];
  now: Date;
  windowMs: number;
  limit: number;
  cost: number;
}): RateLimitDecision {
  const { events, now, windowMs, limit, cost } = params;
  const windowStart = now.getTime() - windowMs;
  const inWindow = events
    .filter((event) => event.occurredAt.getTime() > windowStart)
    .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

  const used = inWindow.reduce((sum, event) => sum + event.amount, 0);
  const allowed = used + cost <= limit;
  const oldest = inWindow[0];
  const retryAfterMs =
    !allowed && oldest ? Math.max(0, oldest.occurredAt.getTime() + windowMs - now.getTime()) : 0;

  return { allowed, used, limit, retryAfterMs };
}
