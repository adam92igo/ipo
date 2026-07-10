import { describe, expect, it } from "vitest";
import { evaluateRateLimit } from "./window";

const HOUR = 60 * 60 * 1000;

describe("evaluateRateLimit", () => {
  it("allows the first request when nothing has happened yet", () => {
    const decision = evaluateRateLimit({
      events: [],
      now: new Date("2026-07-13T12:00:00Z"),
      windowMs: HOUR,
      limit: 5,
      cost: 1,
    });
    expect(decision).toEqual({ allowed: true, used: 0, limit: 5, retryAfterMs: 0 });
  });

  it("allows a request that lands exactly on the limit", () => {
    const now = new Date("2026-07-13T12:00:00Z");
    const events = Array.from({ length: 4 }, () => ({ amount: 1, occurredAt: now }));
    const decision = evaluateRateLimit({ events, now, windowMs: HOUR, limit: 5, cost: 1 });
    expect(decision.allowed).toBe(true);
    expect(decision.used).toBe(4);
  });

  it("blocks a request that would exceed the limit", () => {
    const now = new Date("2026-07-13T12:00:00Z");
    const events = Array.from({ length: 5 }, () => ({ amount: 1, occurredAt: now }));
    const decision = evaluateRateLimit({ events, now, windowMs: HOUR, limit: 5, cost: 1 });
    expect(decision.allowed).toBe(false);
    expect(decision.used).toBe(5);
  });

  it("ignores events that fell outside the trailing window", () => {
    const now = new Date("2026-07-13T12:00:00Z");
    const events = [
      { amount: 1, occurredAt: new Date(now.getTime() - HOUR - 1) }, // just outside
      { amount: 1, occurredAt: new Date(now.getTime() - 30 * 60 * 1000) }, // inside
    ];
    const decision = evaluateRateLimit({ events, now, windowMs: HOUR, limit: 5, cost: 1 });
    expect(decision.used).toBe(1);
    expect(decision.allowed).toBe(true);
  });

  it("sums per-event amounts rather than counting events", () => {
    const now = new Date("2026-07-13T12:00:00Z");
    const events = [
      { amount: 3, occurredAt: now },
      { amount: 2, occurredAt: now },
    ];
    const decision = evaluateRateLimit({ events, now, windowMs: HOUR, limit: 10, cost: 4 });
    expect(decision.used).toBe(5);
    expect(decision.allowed).toBe(true); // 5 + 4 = 9 <= 10

    const blocked = evaluateRateLimit({ events, now, windowMs: HOUR, limit: 8, cost: 4 });
    expect(blocked.allowed).toBe(false); // 5 + 4 = 9 > 8
  });

  it("computes retryAfterMs from the oldest in-window event's expiry", () => {
    const now = new Date("2026-07-13T12:00:00Z");
    const events = [
      { amount: 1, occurredAt: new Date(now.getTime() - 50 * 60 * 1000) }, // 50 min ago
      { amount: 4, occurredAt: now },
    ];
    const decision = evaluateRateLimit({ events, now, windowMs: HOUR, limit: 5, cost: 1 });
    expect(decision.allowed).toBe(false);
    // Oldest event expires the window at +60min from its own timestamp, i.e. 10min from now.
    expect(decision.retryAfterMs).toBe(10 * 60 * 1000);
  });

  it("blocks a single oversized request with no events to wait out", () => {
    const now = new Date("2026-07-13T12:00:00Z");
    const decision = evaluateRateLimit({ events: [], now, windowMs: HOUR, limit: 3, cost: 5 });
    expect(decision.allowed).toBe(false);
    expect(decision.retryAfterMs).toBe(0);
  });

  it("never returns a negative retryAfterMs", () => {
    const now = new Date("2026-07-13T12:00:00Z");
    const events = [{ amount: 5, occurredAt: new Date(now.getTime() - HOUR - 5000) }];
    // This event is technically outside the window, so it shouldn't count or drive retryAfterMs.
    const decision = evaluateRateLimit({ events, now, windowMs: HOUR, limit: 1, cost: 2 });
    expect(decision.used).toBe(0);
    expect(decision.allowed).toBe(false);
    expect(decision.retryAfterMs).toBe(0);
  });
});
