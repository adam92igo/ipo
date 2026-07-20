import type { SectorRefs } from "@/engines/valuation/types";
import type {
  BenchmarkMetric,
  BenchmarkPosition,
  BenchmarkResult,
  FinancialYear,
  PeerCompany,
  Range,
  ReadinessBenchmark,
} from "./types";

export type * from "./types";

const round2 = (x: number) => Math.round(x * 100) / 100;

/** Classifies a value against a low–high band. */
export function positionIn(value: number, range: Range): BenchmarkPosition {
  if (value < range.low) return "below";
  if (value > range.high) return "above";
  return "within";
}

/** Signed distance from the range mid, as a fraction of the mid (0 if mid is 0). */
function vsMid(value: number, range: Range): number {
  if (range.mid === 0) return 0;
  return round2(value / range.mid - 1);
}

/** Latest fiscal year carrying at least one usable metric (highest year wins). */
function latestUsable(financials: FinancialYear[]): FinancialYear | null {
  const usable = [...financials]
    .filter(
      (f) =>
        f.revenue !== null ||
        f.ebitda !== null ||
        f.netIncome !== null ||
        f.freeCashFlow !== null,
    )
    .sort((a, b) => a.fiscalYear - b.fiscalYear);
  return usable[usable.length - 1] ?? null;
}

function metric(
  key: string,
  label: string,
  value: number | null,
  reference: Range,
  unit: BenchmarkMetric["unit"],
  higherIsBetter: boolean,
  note: string,
): BenchmarkMetric {
  return {
    key,
    label,
    value: value === null ? null : round2(value),
    reference,
    position: value === null ? null : positionIn(value, reference),
    vsMid: value === null ? null : vsMid(value, reference),
    unit,
    higherIsBetter,
    note,
  };
}

/**
 * Derives a company's own multiples and ratios from its latest financials and
 * benchmarks them against the sector reference bands. Deterministic: no I/O,
 * no AI, no dates. Missing inputs yield a null value (shown as "n/a"), never
 * a fabricated number.
 *
 * Note on implied multiples: without a market price we cannot observe the
 * company's traded EV. We therefore surface the *sector* reference band as the
 * benchmark and mark the company value null unless an explicit EV is supplied —
 * the honest position for a pre-IPO SME. The ratio comparisons (margins,
 * profitability) are fully derivable and carry the weight here.
 */
export function computeBenchmark({
  financials,
  sectorRefs,
  sectorLabel,
  refsVersion,
  peers,
  peersVersion,
  categoryScores,
  categoryLabels,
  readinessTarget,
}: {
  financials: FinancialYear[];
  sectorRefs: SectorRefs;
  sectorLabel: string;
  refsVersion: string;
  peers: PeerCompany[];
  peersVersion: string;
  categoryScores: Record<string, number> | null;
  categoryLabels: Array<{ id: string; label: string }>;
  readinessTarget: number;
}): BenchmarkResult {
  const latest = latestUsable(financials);
  const assumptions: string[] = [];

  const revenue = latest?.revenue ?? null;
  const ebitda = latest?.ebitda ?? null;
  const netIncome = latest?.netIncome ?? null;
  const fcf = latest?.freeCashFlow ?? null;

  if (latest) {
    assumptions.push(`Ratios derived from fiscal year ${latest.fiscalYear}`);
  } else {
    assumptions.push("No financial history yet — ratio benchmarks unavailable");
  }

  // Financial ratios (fully derivable from the P&L we store).
  const ebitdaMargin =
    revenue && revenue > 0 && ebitda !== null ? (ebitda / revenue) * 100 : null;
  const netMargin =
    revenue && revenue > 0 && netIncome !== null
      ? (netIncome / revenue) * 100
      : null;
  const fcfConversion =
    ebitda && ebitda > 0 && fcf !== null ? (fcf / ebitda) * 100 : null;

  // Reference bands for the ratios are derived from the sector multiples'
  // internal consistency (EV/EBITDA vs EV/Revenue implies an EBITDA margin).
  const impliedMarginBand: Range = {
    low: round2((sectorRefs.evRevenue.low / sectorRefs.evEbitda.high) * 100),
    mid: round2((sectorRefs.evRevenue.mid / sectorRefs.evEbitda.mid) * 100),
    high: round2((sectorRefs.evRevenue.high / sectorRefs.evEbitda.low) * 100),
  };

  const metrics: BenchmarkMetric[] = [
    metric(
      "evEbitda",
      "EV / EBITDA (sector band)",
      null,
      sectorRefs.evEbitda,
      "x",
      false,
      "Sector reference multiple applied at valuation; company's traded EV is unknown pre-IPO.",
    ),
    metric(
      "evRevenue",
      "EV / Revenue (sector band)",
      null,
      sectorRefs.evRevenue,
      "x",
      false,
      "Sector reference multiple; used by the valuation engine.",
    ),
    metric(
      "ebitdaMargin",
      "EBITDA margin",
      ebitdaMargin,
      impliedMarginBand,
      "%",
      true,
      "EBITDA ÷ revenue vs the margin implied by the sector's EV/Revenue and EV/EBITDA bands.",
    ),
    metric(
      "netMargin",
      "Net margin",
      netMargin,
      { low: 3, mid: 8, high: 15 },
      "%",
      true,
      "Net income ÷ revenue vs a broad healthy-SME reference band.",
    ),
    metric(
      "fcfConversion",
      "FCF conversion",
      fcfConversion,
      { low: 40, mid: 65, high: 90 },
      "%",
      true,
      "Free cash flow ÷ EBITDA vs a broad reference band; higher means cash-generative.",
    ),
  ];

  // Readiness vs the IPO-ready target.
  const readiness: ReadinessBenchmark[] = categoryLabels.map(({ id, label }) => {
    const score = categoryScores?.[id] ?? null;
    return {
      categoryId: id,
      label,
      score: score === null ? null : round2(score),
      target: readinessTarget,
      gap: score === null ? null : round2(score - readinessTarget),
      meetsTarget: score === null ? null : score >= readinessTarget,
    };
  });

  if (!categoryScores) {
    assumptions.push(
      "No completed assessment — readiness benchmarks show targets only",
    );
  }

  return {
    sectorLabel,
    refsVersion,
    peersVersion,
    metrics,
    readiness,
    readinessTarget,
    peers,
    assumptions,
  };
}
