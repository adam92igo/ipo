/** All monetary amounts are EUR. Rates are decimals (0.10 = 10%). */

import type { FinancialYear } from "@/engines/valuation/types";

export type { FinancialYear };

/** Tuning knobs for the projection, sourced from versioned config. */
export interface ForecastSettings {
  /** Number of future years to project (> 0). */
  horizonYears: number;
  /** Long-run growth the forecast decays toward. */
  terminalGrowth: number;
  /** Clamp applied to the historical revenue CAGR before projecting. */
  growthClamp: { min: number; max: number };
  /**
   * Optional low/high band around the base case, as +/- fractions of the
   * base growth rate (e.g. 0.3 => base growth +/-30% relative). Drives the
   * optimistic/pessimistic scenarios shown as a shaded band.
   */
  scenarioSpread: number;
}

/** One projected future year for a single metric. */
export interface ForecastPoint {
  fiscalYear: number;
  /** Base-case projected value (EUR). */
  base: number;
  /** Pessimistic scenario (EUR). */
  low: number;
  /** Optimistic scenario (EUR). */
  high: number;
  /** Year-over-year growth applied to reach the base value. */
  growth: number;
}

/** A full projected series for one metric, anchored on its last actual value. */
export interface MetricForecast {
  metric: "revenue" | "ebitda" | "freeCashFlow";
  label: string;
  /** The last historical value the projection starts from (EUR). */
  anchorValue: number;
  anchorYear: number;
  points: ForecastPoint[];
  /** Human-readable record of how this series was derived. */
  assumptions: string[];
}

export interface ForecastResult {
  version: string;
  /** The growth rate the base case starts from (post-clamp). */
  baseGrowth: number;
  /** The raw historical revenue CAGR before clamping (null if not derivable). */
  historicalCagr: number | null;
  horizonYears: number;
  metrics: MetricForecast[];
  /** Metrics that could not be projected, with the reason. */
  skipped: Array<{ metric: string; reason: string }>;
  assumptions: string[];
}
