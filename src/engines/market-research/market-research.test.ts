import { describe, expect, it } from "vitest";
import {
  indicativeMarketCap,
  profileFromFinancials,
  recommendSegment,
  type CompanyProfile,
  type SegmentRule,
} from "./index";

const rules: SegmentRule[] = [
  {
    id: "access",
    label: "Euronext Access",
    tier: 0,
    minMarketCap: null,
    minFreeFloat: null,
    minAuditedYears: 0,
    summary: "Entry market for start-ups and SMEs.",
    bestFor: "Early-stage.",
  },
  {
    id: "access_plus",
    label: "Euronext Access+",
    tier: 1,
    minMarketCap: null,
    minFreeFloat: 1_000_000,
    minAuditedYears: 2,
    summary: "Springboard compartment.",
    bestFor: "Fast-growing SMEs.",
  },
  {
    id: "growth",
    label: "Euronext Growth",
    tier: 2,
    minMarketCap: 10_000_000,
    minFreeFloat: 2_500_000,
    minAuditedYears: 2,
    summary: "SME growth market.",
    bestFor: "Established SMEs.",
  },
  {
    id: "regulated",
    label: "Euronext (regulated)",
    tier: 3,
    minMarketCap: 25_000_000,
    minFreeFloat: 2_500_000,
    minAuditedYears: 3,
    summary: "Main regulated market.",
    bestFor: "Larger companies.",
  },
];

const profile = (over: Partial<CompanyProfile> = {}): CompanyProfile => ({
  revenue: null,
  headcount: null,
  auditedYears: 0,
  valuationMid: null,
  ...over,
});

describe("indicativeMarketCap", () => {
  it("prefers the valuation mid when present", () => {
    expect(indicativeMarketCap(profile({ valuationMid: 30_000_000, revenue: 5_000_000 }))).toEqual({
      value: 30_000_000,
      basis: "valuation",
    });
  });
  it("falls back to revenue as a proxy", () => {
    expect(indicativeMarketCap(profile({ revenue: 5_000_000 }))).toEqual({
      value: 5_000_000,
      basis: "revenue_proxy",
    });
  });
  it("returns unknown when neither is present", () => {
    expect(indicativeMarketCap(profile())).toEqual({ value: null, basis: "unknown" });
  });
});

describe("recommendSegment", () => {
  it("recommends the highest tier the profile supports", () => {
    const rec = recommendSegment({
      profile: profile({ valuationMid: 30_000_000, auditedYears: 3 }),
      rules,
    });
    expect(rec.recommended).toBe("regulated");
  });

  it("recommends Growth for a mid-size, 2-year-audited company", () => {
    const rec = recommendSegment({
      profile: profile({ valuationMid: 15_000_000, auditedYears: 2 }),
      rules,
    });
    expect(rec.recommended).toBe("growth");
  });

  it("drops to Access+ when audited years are enough but size falls short of Growth", () => {
    const rec = recommendSegment({
      profile: profile({ valuationMid: 3_000_000, auditedYears: 2 }),
      rules,
    });
    expect(rec.recommended).toBe("access_plus");
  });

  it("defaults to Access when the company is tiny or unproven", () => {
    const rec = recommendSegment({
      profile: profile({ valuationMid: 500_000, auditedYears: 1 }),
      rules,
    });
    expect(rec.recommended).toBe("access");
  });

  it("defaults to Access when nothing is known", () => {
    const rec = recommendSegment({ profile: profile(), rules });
    expect(rec.recommended).toBe("access");
    expect(rec.rationale.some((r) => r.includes("entry-level"))).toBe(true);
  });

  it("uses revenue as a proxy and flags it in the rationale", () => {
    const rec = recommendSegment({
      profile: profile({ revenue: 20_000_000, auditedYears: 3 }),
      rules,
    });
    expect(rec.recommended).toBe("growth"); // 20M ≥ Growth 10M but < regulated 25M
    expect(rec.rationale.some((r) => r.includes("proxy"))).toBe(true);
  });

  it("returns an assessment per segment in tier order", () => {
    const rec = recommendSegment({
      profile: profile({ valuationMid: 15_000_000, auditedYears: 2 }),
      rules,
    });
    expect(rec.assessments.map((a) => a.segment.id)).toEqual([
      "access",
      "access_plus",
      "growth",
      "regulated",
    ]);
  });

  it("is deterministic", () => {
    const input = { profile: profile({ valuationMid: 15_000_000, auditedYears: 2 }), rules };
    expect(recommendSegment(input)).toEqual(recommendSegment(input));
  });

  it("throws when no rules are provided", () => {
    expect(() => recommendSegment({ profile: profile(), rules: [] })).toThrow();
  });
});

describe("profileFromFinancials", () => {
  it("derives revenue and audited-year count", () => {
    const p = profileFromFinancials(
      [
        { fiscalYear: 2022, revenue: 800, ebitda: 100 },
        { fiscalYear: 2023, revenue: 1000, ebitda: 150 },
        { fiscalYear: 2024, revenue: 1200, ebitda: 200 },
      ],
      { headcount: 40, valuationMid: 5_000_000 },
    );
    expect(p.revenue).toBe(1200);
    expect(p.auditedYears).toBe(3);
    expect(p.headcount).toBe(40);
    expect(p.valuationMid).toBe(5_000_000);
  });

  it("counts years with any P&L metric, not just revenue", () => {
    const p = profileFromFinancials(
      [
        { fiscalYear: 2023, revenue: null, netIncome: 50 },
        { fiscalYear: 2024, revenue: 1000 },
      ],
      { headcount: null, valuationMid: null },
    );
    expect(p.auditedYears).toBe(2);
    expect(p.revenue).toBe(1000);
  });
});
