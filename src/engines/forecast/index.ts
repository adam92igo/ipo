import type {
  FinancialYear,
  ForecastPoint,
  ForecastResult,
  ForecastSettings,
  MetricForecast,
} from "./types";

export type * from "./types";

/** Raised when the history cannot support any projection. */
export class NotForecastableError extends Error {
  constructor(public readonly reason: string) {
    super(reason);
    this.name = "NotForecastableError";
  }
}

const round0 = (x: number) => Math.round(x);
const clamp = (x: number, min: number, max: number) => Math.min(Math.max(x, min), max);
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

const METRIC_LABELS = {
  revenue: "Revenue",
  ebitda: "EBITDA",
  freeCashFlow: "Free cash flow",
} as const;

type MetricKey = keyof typeof METRIC_LABELS;
const PROJECTED_METRICS: MetricKey[] = ["revenue", "ebitda", "freeCashFlow"];

/**
 * Revenue CAGR over the available span, or null when fewer than two positive
 * revenue years exist. CAGR = (last/first)^(1/years) - 1.
 */
export function revenueCagr(financials: FinancialYear[]): number | null {
  const withRevenue = financials
    .filter((f) => f.revenue !== null && f.revenue > 0)
    .sort((a, b) => a.fiscalYear - b.fiscalYear);
  if (withRevenue.length < 2) return null;
  const first = withRevenue[0];
  const last = withRevenue[withRevenue.length - 1];
  const span = last.fiscalYear - first.fiscalYear;
  if (span <= 0) return null;
  return (last.revenue! / first.revenue!) ** (1 / span) - 1;
}

/**
 * Base-case growth path: starts at `baseGrowth` and decays linearly to the
 * terminal growth rate across the horizon. Deterministic and dependency-free.
 */
export function growthPath(
  baseGrowth: number,
  terminalGrowth: number,
  horizonYears: number,
): number[] {
  return Array.from({ length: horizonYears }, (_, i) => {
    const t = horizonYears === 1 ? 0 : i / (horizonYears - 1);
    return baseGrowth + (terminalGrowth - baseGrowth) * t;
  });
}

/** Projects one metric forward from its last actual value along a growth path. */
function projectMetric(
  metric: MetricKey,
  anchorValue: number,
  anchorYear: number,
  baseGrowth: number,
  settings: ForecastSettings,
): MetricForecast {
  const { horizonYears, terminalGrowth, scenarioSpread } = settings;
  const basePath = growthPath(baseGrowth, terminalGrowth, horizonYears);
  // Scenario band: scale each year's growth up/down relative to the base rate.
  const lowPath = basePath.map((g) => g * (1 - scenarioSpread));
  const highPath = basePath.map((g) => g * (1 + scenarioSpread));

  let base = anchorValue;
  let low = anchorValue;
  let high = anchorValue;
  const points: ForecastPoint[] = [];
  for (let i = 0; i < horizonYears; i += 1) {
    base *= 1 + basePath[i];
    low *= 1 + lowPath[i];
    high *= 1 + highPath[i];
    points.push({
      fiscalYear: anchorYear + i + 1,
      base: round0(base),
      low: round0(Math.min(low, base)),
      high: round0(Math.max(high, base)),
      growth: basePath[i],
    });
  }

  return {
    metric,
    label: METRIC_LABELS[metric],
    anchorValue: round0(anchorValue),
    anchorYear,
    points,
    assumptions: [
      `Anchored on ${anchorYear} actual of ${round0(anchorValue)} EUR`,
      `Growth ${pct(basePath[0])} → ${pct(basePath[horizonYears - 1])} over ${horizonYears} years (decaying to terminal ${pct(terminalGrowth)})`,
      `Scenario band ±${pct(scenarioSpread)} on the growth rate`,
    ],
  };
}

/**
 * Deterministic multi-year projection of revenue, EBITDA and free cash flow.
 *
 * Method:
 *  1. Derive the base growth rate from the historical revenue CAGR, clamped to
 *     settings.growthClamp. With fewer than two revenue years, fall back to the
 *     terminal growth rate (flat, conservative forecast).
 *  2. Project each metric from its most recent actual value, growing along a
 *     path that decays linearly from the base rate to terminal growth.
 *  3. Wrap the base case in an optimistic/pessimistic band (scenarioSpread).
 *
 * Same financials + same settings => same output. No I/O, no AI, no Date.now().
 */
export function forecastFinancials({
  financials,
  settings,
  version = "v1",
}: {
  financials: FinancialYear[];
  settings: ForecastSettings;
  version?: string;
}): ForecastResult {
  if (settings.horizonYears <= 0)
    throw new NotForecastableError("horizon must be at least one year");

  const sorted = [...financials].sort((a, b) => a.fiscalYear - b.fiscalYear);
  const usable = sorted.filter((f) =>
    PROJECTED_METRICS.some((m) => f[m] !== null),
  );
  if (usable.length === 0)
    throw new NotForecastableError("no fiscal year carries a projectable metric");

  const cagr = revenueCagr(sorted);
  const assumptions: string[] = [];
  let baseGrowth: number;
  if (cagr === null) {
    baseGrowth = settings.terminalGrowth;
    assumptions.push(
      "Fewer than two revenue years — flat base growth at the terminal rate",
    );
  } else {
    baseGrowth = clamp(cagr, settings.growthClamp.min, settings.growthClamp.max);
    assumptions.push(
      cagr === baseGrowth
        ? `Historical revenue CAGR ${pct(cagr)} used as base growth`
        : `Historical revenue CAGR ${pct(cagr)} clamped to ${pct(baseGrowth)}`,
    );
  }

  const metrics: MetricForecast[] = [];
  const skipped: Array<{ metric: string; reason: string }> = [];
  for (const metric of PROJECTED_METRICS) {
    // Anchor = the latest year that carries a positive value for this metric.
    const anchor = [...usable]
      .reverse()
      .find((f) => f[metric] !== null && (f[metric] as number) > 0);
    if (!anchor) {
      skipped.push({
        metric,
        reason: "no positive historical value to anchor the projection",
      });
      continue;
    }
    metrics.push(
      projectMetric(
        metric,
        anchor[metric] as number,
        anchor.fiscalYear,
        baseGrowth,
        settings,
      ),
    );
  }

  if (metrics.length === 0)
    throw new NotForecastableError(
      "no metric had a positive value to project from",
    );

  return {
    version,
    baseGrowth,
    historicalCagr: cagr,
    horizonYears: settings.horizonYears,
    metrics,
    skipped,
    assumptions,
  };
}
