import { describe, expect, it } from "vitest";
import type { FinancialYear, SectorRefs } from "@/engines/valuation/types";
import { computeBenchmark, positionIn, type PeerCompany } from "./index";

const sectorRefs: SectorRefs = {
  label: "Software & IT services",
  aliases: ["software"],
  wacc: 0.12,
  evEbitda: { low: 9, mid: 13, high: 16 },
  evRevenue: { low: 1.5, mid: 3, high: 5 },
};

const peers: PeerCompany[] = [
  { name: "Peer A", market: "Euronext Growth", evEbitda: 12, evRevenue: 2.8, note: "x" },
];

const categoryLabels = [
  { id: "governance", label: "Governance" },
  { id: "finance", label: "Finance" },
];

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

describe("positionIn", () => {
  it("classifies below / within / above a band", () => {
    const band = { low: 10, mid: 15, high: 20 };
    expect(positionIn(5, band)).toBe("below");
    expect(positionIn(15, band)).toBe("within");
    expect(positionIn(25, band)).toBe("above");
    expect(positionIn(10, band)).toBe("within"); // boundary inclusive
    expect(positionIn(20, band)).toBe("within");
  });
});

describe("computeBenchmark", () => {
  const base = {
    sectorRefs,
    sectorLabel: sectorRefs.label,
    refsVersion: "v2",
    peers,
    peersVersion: "v1",
    categoryLabels,
    readinessTarget: 75,
  };

  it("derives EBITDA and net margins from the latest year", () => {
    const result = computeBenchmark({
      ...base,
      financials: [
        year(2023, { revenue: 800 }),
        year(2024, { revenue: 1000, ebitda: 250, netIncome: 100, freeCashFlow: 200 }),
      ],
      categoryScores: null,
    });
    const ebitdaMargin = result.metrics.find((m) => m.key === "ebitdaMargin")!;
    expect(ebitdaMargin.value).toBe(25); // 250/1000 = 25%
    const netMargin = result.metrics.find((m) => m.key === "netMargin")!;
    expect(netMargin.value).toBe(10); // 100/1000
    const fcf = result.metrics.find((m) => m.key === "fcfConversion")!;
    expect(fcf.value).toBe(80); // 200/250 = 80%
  });

  it("uses the latest fiscal year when several exist", () => {
    const result = computeBenchmark({
      ...base,
      financials: [
        year(2022, { revenue: 500, ebitda: 50 }),
        year(2024, { revenue: 1000, ebitda: 300 }),
      ],
      categoryScores: null,
    });
    const ebitdaMargin = result.metrics.find((m) => m.key === "ebitdaMargin")!;
    expect(ebitdaMargin.value).toBe(30); // from 2024, not 2022
  });

  it("marks derivable metrics null when inputs are missing", () => {
    const result = computeBenchmark({
      ...base,
      financials: [year(2024, { revenue: 1000 })], // no ebitda/netIncome/fcf
      categoryScores: null,
    });
    expect(result.metrics.find((m) => m.key === "ebitdaMargin")!.value).toBeNull();
    expect(result.metrics.find((m) => m.key === "netMargin")!.value).toBeNull();
    expect(result.metrics.find((m) => m.key === "fcfConversion")!.value).toBeNull();
  });

  it("keeps sector-band multiples null (no traded EV pre-IPO)", () => {
    const result = computeBenchmark({
      ...base,
      financials: [year(2024, { revenue: 1000, ebitda: 250 })],
      categoryScores: null,
    });
    const evEbitda = result.metrics.find((m) => m.key === "evEbitda")!;
    expect(evEbitda.value).toBeNull();
    expect(evEbitda.reference).toEqual(sectorRefs.evEbitda);
  });

  it("computes the position and vsMid for a derived ratio", () => {
    const result = computeBenchmark({
      ...base,
      // EBITDA margin 20%. Implied band: low=1.5/16*100=9.38, mid=3/13*100=23.08, high=5/9*100=55.56
      financials: [year(2024, { revenue: 1000, ebitda: 200 })],
      categoryScores: null,
    });
    const m = result.metrics.find((k) => k.key === "ebitdaMargin")!;
    expect(m.value).toBe(20);
    expect(m.position).toBe("within"); // 20 is between 9.38 and 55.56
    expect(m.vsMid).toBeCloseTo(20 / 23.08 - 1, 2);
  });

  it("benchmarks readiness scores against the target with gaps", () => {
    const result = computeBenchmark({
      ...base,
      financials: [year(2024, { revenue: 1000, ebitda: 250 })],
      categoryScores: { governance: 82, finance: 60 },
    });
    const gov = result.readiness.find((r) => r.categoryId === "governance")!;
    expect(gov.score).toBe(82);
    expect(gov.gap).toBe(7); // 82 - 75
    expect(gov.meetsTarget).toBe(true);
    const fin = result.readiness.find((r) => r.categoryId === "finance")!;
    expect(fin.gap).toBe(-15);
    expect(fin.meetsTarget).toBe(false);
  });

  it("returns readiness targets with null scores when no assessment exists", () => {
    const result = computeBenchmark({
      ...base,
      financials: [year(2024, { revenue: 1000 })],
      categoryScores: null,
    });
    expect(result.readiness.every((r) => r.score === null)).toBe(true);
    expect(result.readiness.every((r) => r.target === 75)).toBe(true);
    expect(
      result.assumptions.some((a) => a.includes("No completed assessment")),
    ).toBe(true);
  });

  it("passes peers and versions through unchanged", () => {
    const result = computeBenchmark({
      ...base,
      financials: [year(2024, { revenue: 1000 })],
      categoryScores: null,
    });
    expect(result.peers).toEqual(peers);
    expect(result.refsVersion).toBe("v2");
    expect(result.peersVersion).toBe("v1");
  });

  it("is deterministic: same inputs => identical output", () => {
    const input = {
      ...base,
      financials: [year(2024, { revenue: 1000, ebitda: 250, netIncome: 100 })],
      categoryScores: { governance: 80, finance: 70 },
    };
    expect(computeBenchmark(input)).toEqual(computeBenchmark(input));
  });
});
