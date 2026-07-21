/** All monetary amounts are EUR. Ratios/multiples are plain numbers. */

import type { FinancialYear, Range } from "@/engines/valuation/types";

export type { FinancialYear, Range };

/** Where a company value sits relative to a low–high reference band. */
export type BenchmarkPosition = "below" | "within" | "above";

/** One metric compared against a sector reference range. */
export interface BenchmarkMetric {
  key: string;
  label: string;
  /** The company's own value, or null when it can't be derived. */
  value: number | null;
  reference: Range;
  position: BenchmarkPosition | null;
  /** How the value compares to the range mid, as a fraction (e.g. +0.2 = 20% above mid). */
  vsMid: number | null;
  unit: "x" | "%" | "ratio";
  /** Higher value is better for this metric (drives colour/interpretation). */
  higherIsBetter: boolean;
  note: string;
}

/** One readiness category vs the IPO-ready threshold. */
export interface ReadinessBenchmark {
  categoryId: string;
  label: string;
  score: number | null;
  target: number;
  gap: number | null;
  meetsTarget: boolean | null;
}

/** A curated named peer for the comparables table. */
export interface PeerCompany {
  name: string;
  market: string;
  evEbitda: number | null;
  evRevenue: number | null;
  note: string;
}

export interface BenchmarkResult {
  sectorLabel: string;
  refsVersion: string;
  peersVersion: string;
  /** Implied multiples + financial ratios vs sector reference bands. */
  metrics: BenchmarkMetric[];
  /** Readiness category scores vs the IPO-ready target. */
  readiness: ReadinessBenchmark[];
  readinessTarget: number;
  /** Named peer companies for the sector (curated, cited). */
  peers: PeerCompany[];
  assumptions: string[];
}
