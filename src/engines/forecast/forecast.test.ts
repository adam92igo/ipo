import { describe, expect, it } from "vitest";
import type { FinancialYear } from "@/engines/valuation/types";
import {
  forecastFinancials,
  growthPath,
  NotForecastableError,
  revenueCagr,
  type ForecastSettings,
} from "./index";

const settings: ForecastSettings = {
  horizonYears: 5,
  terminalGrowth: 0.02,
  growthClamp: { min: 0, max: 0.25 },
  scenarioSpread: 0.3,
};

const year = (
  fiscalYear: number,
  fields: Partial<Omit<FinancialYear, "fiscalYear">> = {},
): FinancialYear => ({
  fiscalYear,
  revenue: null,
  ebitda: null,
  netIncome: null,
  netDebt: null,
  freeCashFlow: null,
  ...fields,
});

describe("revenueCagr", () => {
  it("computes CAGR across the available span", () => {
    // 100 -> 200 over 2 years => 2^(1/2)-1 ≈ 0.41421356
    const cagr = revenueCagr([
      year(2022, { revenue: 100 }),
      year(2024, { revenue: 200 }),
    ]);
    expect(cagr).toBeCloseTo(0.41421356, 6);
  });

  it("returns null with fewer than two positive revenue years", () => {
    expect(revenueCagr([year(2024, { revenue: 100 })])).toBeNull();
    expect(revenueCagr([year(2024, { ebitda: 50 })])).toBeNull();
  });

  it("ignores zero/negative revenue years", () => {
    expect(
      revenueCagr([year(2022, { revenue: 0 }), year(2024, { revenue: 100 })]),
    ).toBeNull();
  });
});

describe("growthPath", () => {
  it("decays linearly from base to terminal across the horizon", () => {
    const path = growthPath(0.2, 0.02, 5);
    expect(path).toHaveLength(5);
    expect(path[0]).toBeCloseTo(0.2, 10); // first year = base
    expect(path[4]).toBeCloseTo(0.02, 10); // last year = terminal
    expect(path[2]).toBeCloseTo(0.11, 10); // midpoint
  });

  it("keeps full base growth for a single-year horizon", () => {
    expect(growthPath(0.2, 0.02, 1)).toEqual([0.2]);
  });
});

describe("forecastFinancials", () => {
  const history: FinancialYear[] = [
    year(2022, { revenue: 1000, ebitda: 200, freeCashFlow: 150 }),
    year(2023, { revenue: 1200, ebitda: 260, freeCashFlow: 180 }),
    year(2024, { revenue: 1440, ebitda: 320, freeCashFlow: 210 }),
  ];

  it("projects every metric from its latest positive actual", () => {
    const result = forecastFinancials({ financials: history, settings });
    expect(result.metrics.map((m) => m.metric)).toEqual([
      "revenue",
      "ebitda",
      "freeCashFlow",
    ]);
    const revenue = result.metrics.find((m) => m.metric === "revenue")!;
    expect(revenue.anchorYear).toBe(2024);
    expect(revenue.anchorValue).toBe(1440);
    expect(revenue.points).toHaveLength(5);
    expect(revenue.points[0].fiscalYear).toBe(2025);
    expect(revenue.points[4].fiscalYear).toBe(2029);
  });

  it("uses the clamped revenue CAGR as base growth", () => {
    // 1000 -> 1440 over 2 years => 20% CAGR, within [0, 25%] so unclamped.
    const result = forecastFinancials({ financials: history, settings });
    expect(result.historicalCagr).toBeCloseTo(0.2, 6);
    expect(result.baseGrowth).toBeCloseTo(0.2, 6);
    // First projected revenue = 1440 * 1.20 = 1728.
    const revenue = result.metrics.find((m) => m.metric === "revenue")!;
    expect(revenue.points[0].base).toBe(1728);
  });

  it("clamps an explosive CAGR to the configured maximum", () => {
    const explosive: FinancialYear[] = [
      year(2022, { revenue: 100, ebitda: 10 }),
      year(2024, { revenue: 1000, ebitda: 100 }), // ~216% CAGR
    ];
    const result = forecastFinancials({ financials: explosive, settings });
    expect(result.baseGrowth).toBe(0.25);
    expect(result.assumptions.some((a) => a.includes("clamped"))).toBe(true);
  });

  it("brackets the base case with a symmetric-ish scenario band", () => {
    const result = forecastFinancials({ financials: history, settings });
    const revenue = result.metrics.find((m) => m.metric === "revenue")!;
    for (const p of revenue.points) {
      expect(p.low).toBeLessThanOrEqual(p.base);
      expect(p.high).toBeGreaterThanOrEqual(p.base);
    }
  });

  it("falls back to a flat terminal-rate forecast with one revenue year", () => {
    const single: FinancialYear[] = [
      year(2024, { revenue: 500, ebitda: 100, freeCashFlow: 80 }),
    ];
    const result = forecastFinancials({ financials: single, settings });
    expect(result.historicalCagr).toBeNull();
    expect(result.baseGrowth).toBe(settings.terminalGrowth);
  });

  it("skips a metric with no positive history but still projects the rest", () => {
    const noEbitda: FinancialYear[] = [
      year(2022, { revenue: 1000 }),
      year(2024, { revenue: 1200, freeCashFlow: 100 }),
    ];
    const result = forecastFinancials({ financials: noEbitda, settings });
    expect(result.metrics.map((m) => m.metric)).toEqual([
      "revenue",
      "freeCashFlow",
    ]);
    expect(result.skipped).toEqual([
      {
        metric: "ebitda",
        reason: "no positive historical value to anchor the projection",
      },
    ]);
  });

  it("is deterministic: same inputs => identical output", () => {
    const a = forecastFinancials({ financials: history, settings });
    const b = forecastFinancials({ financials: history, settings });
    expect(a).toEqual(b);
  });

  it("throws when no metric can be projected", () => {
    expect(() =>
      forecastFinancials({
        financials: [year(2024, { netDebt: 50 })],
        settings,
      }),
    ).toThrow(NotForecastableError);
  });

  it("throws on a non-positive horizon", () => {
    expect(() =>
      forecastFinancials({
        financials: history,
        settings: { ...settings, horizonYears: 0 },
      }),
    ).toThrow(NotForecastableError);
  });
});
