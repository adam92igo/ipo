import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { migrateTestDb, seedOrgWithUser, truncateAll } from "../../test/db";
import { RateLimitExceededError } from "./errors";
import { checkAndRecordAiUsage } from "./rate-limit";

const HOUR = 60 * 60 * 1000;

describe("checkAndRecordAiUsage (tenant isolation + windowing)", () => {
  beforeAll(async () => {
    await migrateTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  it("allows calls up to the limit, then blocks the next one", async () => {
    const ctx = await seedOrgWithUser("owner");
    const now = new Date("2026-07-13T12:00:00Z");

    for (let i = 0; i < 3; i += 1) {
      await checkAndRecordAiUsage(ctx, {
        feature: "fill_profile",
        cost: 1,
        now,
        limit: 3,
        windowMs: HOUR,
      });
    }

    await expect(
      checkAndRecordAiUsage(ctx, {
        feature: "fill_profile",
        cost: 1,
        now,
        limit: 3,
        windowMs: HOUR,
      }),
    ).rejects.toThrow(RateLimitExceededError);
  });

  it("allows requests again once the window has rolled past the old usage", async () => {
    const ctx = await seedOrgWithUser("owner");
    const first = new Date("2026-07-13T12:00:00Z");

    for (let i = 0; i < 3; i += 1) {
      await checkAndRecordAiUsage(ctx, {
        feature: "fill_profile",
        cost: 1,
        now: first,
        limit: 3,
        windowMs: HOUR,
      });
    }

    const later = new Date(first.getTime() + HOUR + 1);
    await expect(
      checkAndRecordAiUsage(ctx, {
        feature: "fill_profile",
        cost: 1,
        now: later,
        limit: 3,
        windowMs: HOUR,
      }),
    ).resolves.toBeUndefined();
  });

  it("never lets one organization's usage affect another's limit", async () => {
    const ctxA = await seedOrgWithUser("owner");
    const ctxB = await seedOrgWithUser("owner");
    const now = new Date("2026-07-13T12:00:00Z");

    for (let i = 0; i < 3; i += 1) {
      await checkAndRecordAiUsage(ctxA, {
        feature: "fill_profile",
        cost: 1,
        now,
        limit: 3,
        windowMs: HOUR,
      });
    }
    await expect(
      checkAndRecordAiUsage(ctxA, {
        feature: "fill_profile",
        cost: 1,
        now,
        limit: 3,
        windowMs: HOUR,
      }),
    ).rejects.toThrow(RateLimitExceededError);

    // Org B still has its full budget for the same feature.
    await expect(
      checkAndRecordAiUsage(ctxB, {
        feature: "fill_profile",
        cost: 1,
        now,
        limit: 3,
        windowMs: HOUR,
      }),
    ).resolves.toBeUndefined();
  });

  it("tracks each AI feature against its own independent budget", async () => {
    const ctx = await seedOrgWithUser("owner");
    const now = new Date("2026-07-13T12:00:00Z");

    for (let i = 0; i < 2; i += 1) {
      await checkAndRecordAiUsage(ctx, {
        feature: "fill_profile",
        cost: 1,
        now,
        limit: 2,
        windowMs: HOUR,
      });
    }
    await expect(
      checkAndRecordAiUsage(ctx, {
        feature: "fill_profile",
        cost: 1,
        now,
        limit: 2,
        windowMs: HOUR,
      }),
    ).rejects.toThrow(RateLimitExceededError);

    // Assistant messages haven't been touched — its own budget is intact.
    await expect(
      checkAndRecordAiUsage(ctx, {
        feature: "assistant_message",
        cost: 1,
        now,
        limit: 2,
        windowMs: HOUR,
      }),
    ).resolves.toBeUndefined();
  });

  it("consumes per-call cost, not a flat one unit per call", async () => {
    const ctx = await seedOrgWithUser("owner");
    const now = new Date("2026-07-13T12:00:00Z");

    await checkAndRecordAiUsage(ctx, {
      feature: "assistant_message",
      cost: 8,
      now,
      limit: 10,
      windowMs: HOUR,
    });

    // 8 used already; a further cost of 3 would put it at 11 > 10.
    await expect(
      checkAndRecordAiUsage(ctx, {
        feature: "assistant_message",
        cost: 3,
        now,
        limit: 10,
        windowMs: HOUR,
      }),
    ).rejects.toThrow(RateLimitExceededError);

    // But a cost of 2 fits (8 + 2 = 10).
    await expect(
      checkAndRecordAiUsage(ctx, {
        feature: "assistant_message",
        cost: 2,
        now,
        limit: 10,
        windowMs: HOUR,
      }),
    ).resolves.toBeUndefined();
  });

  it("serializes concurrent calls so exactly `limit` of them succeed", async () => {
    const ctx = await seedOrgWithUser("owner");
    const now = new Date("2026-07-13T12:00:00Z");

    const attempts = Array.from({ length: 10 }, () =>
      checkAndRecordAiUsage(ctx, {
        feature: "fill_profile",
        cost: 1,
        now,
        limit: 4,
        windowMs: HOUR,
      }),
    );
    const results = await Promise.allSettled(attempts);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(4);
    expect(rejected).toHaveLength(6);
    for (const r of rejected) {
      expect((r as PromiseRejectedResult).reason).toBeInstanceOf(RateLimitExceededError);
    }
  });
});
