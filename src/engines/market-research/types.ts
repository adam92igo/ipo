/** Amounts in EUR. Deterministic segment fit + market-context assembly. */

import type { FinancialYear } from "@/engines/valuation/types";

export type { FinancialYear };

export type EuronextSegment = "access" | "access_plus" | "growth" | "regulated";

/** The company size profile the segment fit is judged against. */
export interface CompanyProfile {
  /** Most recent revenue (EUR), or null if unknown. */
  revenue: number | null;
  headcount: number | null;
  /** Number of audited fiscal years available (drives Growth eligibility). */
  auditedYears: number;
  /** Indicative equity valuation mid, if a valuation has been run (EUR). */
  valuationMid: number | null;
}

/** One segment's admission profile, from versioned config. */
export interface SegmentRule {
  id: EuronextSegment;
  label: string;
  /** Ordinal for "step up" ordering (access=0 … regulated=3). */
  tier: number;
  /** Minimum indicative market cap to be a natural fit (EUR); null = none. */
  minMarketCap: number | null;
  /** Minimum free float / public hands (EUR); null = none. */
  minFreeFloat: number | null;
  /** Minimum audited years of accounts required. */
  minAuditedYears: number;
  summary: string;
  bestFor: string;
}

export interface SegmentAssessment {
  segment: SegmentRule;
  /** Does the company plausibly meet this segment's bar? */
  eligible: boolean;
  /** Human-readable reasons (met and unmet criteria). */
  reasons: string[];
}

export interface SegmentRecommendation {
  /** The recommended segment id. */
  recommended: EuronextSegment;
  /** Per-segment eligibility, tier order. */
  assessments: SegmentAssessment[];
  /** Why this segment was chosen over the others. */
  rationale: string[];
}
