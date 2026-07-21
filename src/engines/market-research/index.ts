import type {
  CompanyProfile,
  EuronextSegment,
  SegmentAssessment,
  SegmentRecommendation,
  SegmentRule,
} from "./types";

export type * from "./types";

const round0 = (x: number) => Math.round(x);
const eur = (x: number) => `€${round0(x).toLocaleString("en-GB")}`;

/**
 * A company's "indicative market cap" for segment fit. Prefer a real valuation
 * mid; otherwise fall back to revenue as a rough proxy (clearly flagged). Null
 * when neither is known.
 */
export function indicativeMarketCap(profile: CompanyProfile): {
  value: number | null;
  basis: "valuation" | "revenue_proxy" | "unknown";
} {
  if (profile.valuationMid !== null && profile.valuationMid > 0) {
    return { value: profile.valuationMid, basis: "valuation" };
  }
  if (profile.revenue !== null && profile.revenue > 0) {
    return { value: profile.revenue, basis: "revenue_proxy" };
  }
  return { value: null, basis: "unknown" };
}

/** Evaluates one segment's admission bar against the company profile. */
function assessSegment(
  rule: SegmentRule,
  profile: CompanyProfile,
  marketCap: number | null,
): SegmentAssessment {
  const reasons: string[] = [];
  let eligible = true;

  if (rule.minAuditedYears > 0) {
    const ok = profile.auditedYears >= rule.minAuditedYears;
    eligible = eligible && ok;
    reasons.push(
      `${ok ? "✓" : "✗"} ${rule.minAuditedYears}+ audited year(s) of accounts (have ${profile.auditedYears})`,
    );
  }

  if (rule.minMarketCap !== null) {
    if (marketCap === null) {
      eligible = false;
      reasons.push(
        `? Indicative market cap of ${eur(rule.minMarketCap)}+ expected — run a valuation to confirm`,
      );
    } else {
      const ok = marketCap >= rule.minMarketCap;
      eligible = eligible && ok;
      reasons.push(
        `${ok ? "✓" : "✗"} Indicative size ${eur(rule.minMarketCap)}+ (est. ${eur(marketCap)})`,
      );
    }
  }

  if (rule.minFreeFloat !== null) {
    // Free float can't be known pre-IPO; state the requirement as informational.
    reasons.push(
      `• Requires ${eur(rule.minFreeFloat)}+ in public hands at listing`,
    );
  }

  if (rule.minMarketCap === null && rule.minFreeFloat === null && rule.minAuditedYears === 0) {
    reasons.push("• No minimum size, free float, or track-record threshold");
  }

  return { segment: rule, eligible, reasons };
}

/**
 * Deterministic Euronext segment recommendation. Evaluates each segment's
 * admission bar against the company's size profile and recommends the HIGHEST
 * tier the company plausibly qualifies for (a more senior market gives more
 * visibility and liquidity, so we step up as far as the profile supports).
 *
 * Pure: no I/O, no AI, no dates. Same profile + same rules => same output.
 */
export function recommendSegment({
  profile,
  rules,
}: {
  profile: CompanyProfile;
  rules: SegmentRule[];
}): SegmentRecommendation {
  if (rules.length === 0)
    throw new Error("recommendSegment: at least one segment rule is required");

  const ordered = [...rules].sort((a, b) => a.tier - b.tier);
  const { value: marketCap, basis } = indicativeMarketCap(profile);

  const assessments = ordered.map((rule) =>
    assessSegment(rule, profile, marketCap),
  );

  // Recommend the highest tier that is eligible; fall back to the lowest tier
  // (Access has no thresholds, so it is always eligible as a floor).
  const eligibleTiers = assessments.filter((a) => a.eligible);
  const recommended =
    eligibleTiers.length > 0
      ? eligibleTiers[eligibleTiers.length - 1].segment.id
      : ordered[0].id;

  const rationale: string[] = [];
  if (basis === "valuation") {
    rationale.push(`Sizing uses the indicative valuation mid of ${eur(marketCap!)}.`);
  } else if (basis === "revenue_proxy") {
    rationale.push(
      `No valuation yet — latest revenue of ${eur(marketCap!)} is used as a rough size proxy; run a valuation to refine.`,
    );
  } else {
    rationale.push(
      "No revenue or valuation on record — recommendation defaults to the entry-level market until size is known.",
    );
  }

  const rec = assessments.find((a) => a.segment.id === recommended)!;
  rationale.push(
    `Recommended: ${rec.segment.label} — the most senior market the current profile supports.`,
  );
  if (recommended !== ordered[ordered.length - 1].id) {
    const next = ordered.find((r) => r.tier > rec.segment.tier);
    if (next) {
      rationale.push(
        `Next step up is ${next.label}; close the gaps above to reach it.`,
      );
    }
  }

  return { recommended, assessments, rationale };
}

/** Convenience: builds a CompanyProfile from stored financials + extras. */
export function profileFromFinancials(
  financials: FinancialYearLike[],
  extras: { headcount: number | null; valuationMid: number | null },
): CompanyProfile {
  const sorted = [...financials].sort((a, b) => a.fiscalYear - b.fiscalYear);
  const withRevenue = sorted.filter((f) => f.revenue !== null && f.revenue > 0);
  const latestRevenue = withRevenue.at(-1)?.revenue ?? null;
  return {
    revenue: latestRevenue,
    headcount: extras.headcount,
    // Each stored fiscal year with any P&L metric counts as an audited year.
    auditedYears: sorted.filter(
      (f) => f.revenue !== null || f.ebitda !== null || f.netIncome !== null,
    ).length,
    valuationMid: extras.valuationMid,
  };
}

interface FinancialYearLike {
  fiscalYear: number;
  revenue: number | null;
  ebitda?: number | null;
  netIncome?: number | null;
}

export type { EuronextSegment };
