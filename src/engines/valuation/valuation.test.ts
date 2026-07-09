import { describe, expect, it } from "vitest";
import {
  NotApplicableError,
  aggregateValuation,
  comparablesValuation,
  dcfValuation,
  marketMultiplesValuation,
  matchSector,
  prepareValuation,
} from "./index";
import type { FinancialYear, ValuationRefs } from "./types";

/**
 * DCF fixture, hand-computed:
 *  baseFCF 1000, growth [10%, 10%], wacc 10%, terminal growth 2%, netDebt 750
 *  FCF1 = 1100 -> PV 1100/1.1   = 1000
 *  FCF2 = 1210 -> PV 1210/1.21  = 1000
 *  TV   = 1210*1.02/(0.10-0.02) = 15427.5 -> PV 15427.5/1.21 = 12750
 *  EV   = 1000 + 1000 + 12750  = 14750 ; equity = 14750 - 750 = 14000
 */
describe("dcfValuation", () => {
  const inputs = {
    baseFreeCashFlow: 1000,
    growthRates: [0.1, 0.1],
    wacc: 0.1,
    terminalGrowth: 0.02,
    netDebt: 750,
  };

  it("discounts explicit cash flows and the terminal value", () => {
    const result = dcfValuation(inputs);
    expect(result.presentValues.map(Math.round)).toEqual([1000, 1000]);
    expect(Math.round(result.terminalValuePresent)).toBe(12750);
    expect(Math.round(result.enterpriseValue)).toBe(14750);
    expect(Math.round(result.equityValue)).toBe(14000);
  });

  it("is deterministic", () => {
    expect(dcfValuation(inputs)).toEqual(dcfValuation(inputs));
  });

  it("rejects wacc <= terminal growth", () => {
    expect(() => dcfValuation({ ...inputs, wacc: 0.02 })).toThrow(NotApplicableError);
    expect(() => dcfValuation({ ...inputs, wacc: 0.015 })).toThrow(NotApplicableError);
  });

  it("rejects non-positive base free cash flow", () => {
    expect(() => dcfValuation({ ...inputs, baseFreeCashFlow: 0 })).toThrow(
      NotApplicableError,
    );
    expect(() => dcfValuation({ ...inputs, baseFreeCashFlow: -50 })).toThrow(
      NotApplicableError,
    );
  });

  it("rejects an empty forecast", () => {
    expect(() => dcfValuation({ ...inputs, growthRates: [] })).toThrow(
      NotApplicableError,
    );
  });
});

describe("comparablesValuation", () => {
  it("applies the EV/EBITDA range and deducts net debt", () => {
    const result = comparablesValuation({
      metric: 2000,
      multiple: { low: 5, mid: 6.5, high: 8 },
      netDebt: 1000,
    });
    expect(result.equity).toEqual({ low: 9000, mid: 12000, high: 15000 });
  });

  it("floors equity at zero when net debt exceeds EV", () => {
    const result = comparablesValuation({
      metric: 100,
      multiple: { low: 5, mid: 6, high: 7 },
      netDebt: 10000,
    });
    expect(result.equity).toEqual({ low: 0, mid: 0, high: 0 });
  });

  it("rejects non-positive EBITDA", () => {
    expect(() =>
      comparablesValuation({
        metric: 0,
        multiple: { low: 5, mid: 6, high: 7 },
        netDebt: 0,
      }),
    ).toThrow(NotApplicableError);
  });
});

describe("marketMultiplesValuation", () => {
  it("applies the EV/Revenue range and deducts net debt", () => {
    const result = marketMultiplesValuation({
      metric: 12000,
      multiple: { low: 0.8, mid: 1.2, high: 1.6 },
      netDebt: 1000,
    });
    expect(result.equity).toEqual({ low: 8600, mid: 13400, high: 18200 });
  });
});

describe("aggregateValuation", () => {
  it("takes the union of ranges and averages the mids", () => {
    const aggregated = aggregateValuation([
      dcfValuation({
        baseFreeCashFlow: 1000,
        growthRates: [0.1, 0.1],
        wacc: 0.1,
        terminalGrowth: 0.02,
        netDebt: 750,
      }),
      comparablesValuation({
        metric: 2000,
        multiple: { low: 5, mid: 6.5, high: 8 },
        netDebt: 1000,
      }),
      marketMultiplesValuation({
        metric: 12000,
        multiple: { low: 0.8, mid: 1.2, high: 1.6 },
        netDebt: 1000,
      }),
    ]);
    expect(aggregated.low).toBe(8600); // min of 14000, 9000, 8600
    expect(aggregated.high).toBe(18200); // max of 14000, 15000, 18200
    expect(aggregated.mid).toBe(13133); // mean(14000, 12000, 13400) rounded
    expect(aggregated.methodsUsed).toEqual(["dcf", "comparables", "market_multiples"]);
  });

  it("requires at least one applicable method", () => {
    expect(() => aggregateValuation([])).toThrow(NotApplicableError);
  });
});

const refs: ValuationRefs = {
  version: "test",
  note: "",
  discounting: { forecastYears: 3, terminalGrowth: 0.02 },
  growthClamp: { min: 0, max: 0.2 },
  sectors: {
    software: {
      label: "Software",
      aliases: ["software", "saas"],
      wacc: 0.12,
      evEbitda: { low: 9, mid: 12, high: 15 },
      evRevenue: { low: 1.5, mid: 2.5, high: 4 },
    },
    default: {
      label: "Default",
      aliases: [],
      wacc: 0.1,
      evEbitda: { low: 6, mid: 8, high: 10 },
      evRevenue: { low: 0.8, mid: 1.3, high: 2 },
    },
  },
};

describe("matchSector", () => {
  it("matches on alias substrings, case-insensitively", () => {
    expect(matchSector("SaaS B2B", refs).label).toBe("Software");
    expect(matchSector("software édition", refs).label).toBe("Software");
  });

  it("falls back to the default sector", () => {
    expect(matchSector("Boulangerie", refs).label).toBe("Default");
  });
});

describe("prepareValuation", () => {
  const financials: FinancialYear[] = [
    { fiscalYear: 2023, revenue: 8000, ebitda: 800, netIncome: 300, netDebt: 900, freeCashFlow: 350 },
    { fiscalYear: 2024, revenue: 10000, ebitda: 1200, netIncome: 500, netDebt: 1000, freeCashFlow: 500 },
    // 2025 latest: revenue CAGR from 8000 over 2 years = sqrt(12500/8000)-1 = 25% -> clamped to 20%
    { fiscalYear: 2025, revenue: 12500, ebitda: 1500, netIncome: 700, netDebt: 1000, freeCashFlow: 600 },
  ];

  it("runs all three methods off the latest year and clamps growth", () => {
    const result = prepareValuation({ financials, sector: "SaaS", refs });
    expect(result.aggregated.methodsUsed).toEqual([
      "dcf",
      "comparables",
      "market_multiples",
    ]);
    // Comparables: 1500 * {9,12,15} - 1000 = {12500, 17000, 21500}
    const comparables = result.methods.find((m) => m.method === "comparables")!;
    expect("equity" in comparables && comparables.equity).toEqual({
      low: 12500,
      mid: 17000,
      high: 21500,
    });
    // Growth clamped: 25% CAGR -> 20% first-year growth
    expect(
      result.assumptions.some((a) => a.includes("clamped") || a.includes("20")),
    ).toBe(true);
  });

  it("skips DCF when free cash flow is missing or negative, and still aggregates", () => {
    const noFcf = financials.map((f) => ({ ...f, freeCashFlow: null }));
    const result = prepareValuation({ financials: noFcf, sector: "SaaS", refs });
    expect(result.aggregated.methodsUsed).toEqual(["comparables", "market_multiples"]);
    expect(result.aggregated.methodsSkipped.map((s) => s.method)).toEqual(["dcf"]);
  });

  it("throws when no financial year has any usable metric", () => {
    expect(() =>
      prepareValuation({
        financials: [
          { fiscalYear: 2025, revenue: null, ebitda: null, netIncome: null, netDebt: null, freeCashFlow: null },
        ],
        sector: "SaaS",
        refs,
      }),
    ).toThrow(NotApplicableError);
  });

  it("uses zero net debt when the latest year does not provide it", () => {
    const noDebt = financials.map((f) => ({ ...f, netDebt: null }));
    const result = prepareValuation({ financials: noDebt, sector: "SaaS", refs });
    const comparables = result.methods.find((m) => m.method === "comparables")!;
    // 1500 * {9,12,15} - 0
    expect("equity" in comparables && comparables.equity).toEqual({
      low: 13500,
      mid: 18000,
      high: 22500,
    });
    expect(result.assumptions.some((a) => a.toLowerCase().includes("net debt"))).toBe(
      true,
    );
  });
});
