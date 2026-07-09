import type {
  AggregatedValuation,
  DcfInputs,
  DcfResult,
  FinancialYear,
  MethodResult,
  MultipleInputs,
  MultipleResult,
  Range,
  SectorRefs,
  ValuationRefs,
} from "./types";

export type * from "./types";

/** Raised when a method cannot run on the provided inputs. */
export class NotApplicableError extends Error {
  constructor(
    public readonly method: string,
    public readonly reason: string,
  ) {
    super(`${method}: ${reason}`);
    this.name = "NotApplicableError";
  }
}

const round0 = (x: number) => Math.round(x);
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

/**
 * Discounted cash flows: explicit forecast grown year by year from the base
 * FCF, plus a Gordon-growth terminal value, all discounted at the WACC.
 * EV = Σ FCF_t/(1+wacc)^t + [FCF_n(1+g)/(wacc-g)]/(1+wacc)^n ; equity = EV - net debt.
 */
export function dcfValuation(inputs: DcfInputs): DcfResult {
  const { baseFreeCashFlow, growthRates, wacc, terminalGrowth, netDebt } = inputs;
  if (baseFreeCashFlow <= 0)
    throw new NotApplicableError("dcf", "requires a positive free cash flow");
  if (growthRates.length === 0)
    throw new NotApplicableError("dcf", "requires at least one forecast year");
  if (wacc <= terminalGrowth)
    throw new NotApplicableError("dcf", "WACC must exceed the terminal growth rate");

  const presentValues: number[] = [];
  let cashFlow = baseFreeCashFlow;
  for (let year = 1; year <= growthRates.length; year += 1) {
    cashFlow *= 1 + growthRates[year - 1];
    presentValues.push(cashFlow / (1 + wacc) ** year);
  }

  const horizon = growthRates.length;
  const terminalValue = (cashFlow * (1 + terminalGrowth)) / (wacc - terminalGrowth);
  const terminalValuePresent = terminalValue / (1 + wacc) ** horizon;

  const enterpriseValue =
    presentValues.reduce((sum, pv) => sum + pv, 0) + terminalValuePresent;
  const equityValue = enterpriseValue - netDebt;

  return {
    method: "dcf",
    enterpriseValue: round0(enterpriseValue),
    equityValue: round0(equityValue),
    presentValues,
    terminalValuePresent,
    assumptions: [
      `${horizon}-year explicit forecast, first-year growth ${pct(growthRates[0])}`,
      `WACC ${pct(wacc)}, terminal growth ${pct(terminalGrowth)} (Gordon-Shapiro)`,
      `Net debt of ${round0(netDebt)} EUR deducted from enterprise value`,
    ],
  };
}

function applyMultiple(
  method: MultipleResult["method"],
  metricName: string,
  { metric, multiple, netDebt }: MultipleInputs,
): MultipleResult {
  if (metric <= 0)
    throw new NotApplicableError(method, `requires a positive ${metricName}`);
  const equity: Range = {
    low: round0(Math.max(0, metric * multiple.low - netDebt)),
    mid: round0(Math.max(0, metric * multiple.mid - netDebt)),
    high: round0(Math.max(0, metric * multiple.high - netDebt)),
  };
  return {
    method,
    equity,
    assumptions: [
      `${metricName} of ${round0(metric)} EUR x sector multiple ${multiple.low}-${multiple.high} (mid ${multiple.mid})`,
      `Net debt of ${round0(netDebt)} EUR deducted; equity floored at 0`,
    ],
  };
}

/** Sector comparables on EV/EBITDA. */
export function comparablesValuation(inputs: MultipleInputs): MultipleResult {
  return applyMultiple("comparables", "EBITDA", inputs);
}

/** Market multiples on EV/Revenue. */
export function marketMultiplesValuation(inputs: MultipleInputs): MultipleResult {
  return applyMultiple("market_multiples", "revenue", inputs);
}

function equityRangeOf(result: MethodResult): Range {
  if (result.method === "dcf") {
    return { low: result.equityValue, mid: result.equityValue, high: result.equityValue };
  }
  return result.equity;
}

/** Union of the method ranges; the mid is the average of the method mids. */
export function aggregateValuation(
  methods: MethodResult[],
  skipped: Array<{ method: string; reason: string }> = [],
): AggregatedValuation {
  if (methods.length === 0)
    throw new NotApplicableError(
      "aggregate",
      "no valuation method could run on the provided financials",
    );
  const ranges = methods.map(equityRangeOf);
  return {
    low: round0(Math.min(...ranges.map((r) => r.low))),
    high: round0(Math.max(...ranges.map((r) => r.high))),
    mid: round0(ranges.reduce((sum, r) => sum + r.mid, 0) / ranges.length),
    methodsUsed: methods.map((m) => m.method),
    methodsSkipped: skipped,
  };
}

/** Case-insensitive alias match on the company's free-text sector; falls back to `default`. */
export function matchSector(sector: string, refs: ValuationRefs): SectorRefs {
  const needle = sector.toLowerCase();
  for (const [key, entry] of Object.entries(refs.sectors)) {
    if (key === "default") continue;
    if (entry.aliases.some((alias) => needle.includes(alias.toLowerCase()))) {
      return entry;
    }
  }
  return refs.sectors.default;
}

export interface PreparedValuation {
  sector: SectorRefs;
  methods: MethodResult[];
  aggregated: AggregatedValuation;
  /** Human-readable record of every derivation decision. */
  assumptions: string[];
}

/**
 * Derives the three methods' inputs from raw financial history + reference
 * data, runs whatever is applicable and aggregates. Deterministic: same
 * financials + same refs => same output.
 *
 * Derivations:
 * - latest fiscal year = highest year carrying at least one metric
 * - first-year growth = revenue CAGR across available years, clamped to
 *   refs.growthClamp, decaying linearly to the terminal growth rate
 * - missing net debt is treated as 0 (flagged in assumptions)
 */
export function prepareValuation({
  financials,
  sector,
  refs,
}: {
  financials: FinancialYear[];
  sector: string;
  refs: ValuationRefs;
}): PreparedValuation {
  const usable = [...financials]
    .filter(
      (f) =>
        f.revenue !== null ||
        f.ebitda !== null ||
        f.freeCashFlow !== null ||
        f.netIncome !== null,
    )
    .sort((a, b) => a.fiscalYear - b.fiscalYear);
  if (usable.length === 0)
    throw new NotApplicableError(
      "aggregate",
      "no fiscal year carries any usable metric",
    );

  const latest = usable[usable.length - 1];
  const sectorRefs = matchSector(sector, refs);
  const assumptions: string[] = [
    `Sector mapped to "${sectorRefs.label}" (refs ${refs.version})`,
    `Latest fiscal year used: ${latest.fiscalYear}`,
  ];

  const netDebt = latest.netDebt ?? 0;
  if (latest.netDebt === null)
    assumptions.push("Net debt not provided for the latest year — assumed 0 EUR");

  // Revenue CAGR over the available span, clamped.
  const withRevenue = usable.filter((f) => f.revenue !== null && f.revenue > 0);
  let initialGrowth = 0;
  if (withRevenue.length >= 2) {
    const first = withRevenue[0];
    const last = withRevenue[withRevenue.length - 1];
    const span = last.fiscalYear - first.fiscalYear;
    if (span > 0) {
      const cagr = (last.revenue! / first.revenue!) ** (1 / span) - 1;
      initialGrowth = Math.min(
        Math.max(cagr, refs.growthClamp.min),
        refs.growthClamp.max,
      );
      assumptions.push(
        cagr === initialGrowth
          ? `Revenue CAGR ${pct(cagr)} used as first-year growth`
          : `Revenue CAGR ${pct(cagr)} clamped to ${pct(initialGrowth)} for the forecast`,
      );
    }
  } else {
    assumptions.push(
      "Fewer than two revenue years — flat forecast at terminal growth",
    );
    initialGrowth = refs.discounting.terminalGrowth;
  }

  // Linear decay from initial growth to terminal growth across the horizon.
  const { forecastYears, terminalGrowth } = refs.discounting;
  const growthRates = Array.from({ length: forecastYears }, (_, i) => {
    const t = forecastYears === 1 ? 1 : i / (forecastYears - 1);
    return initialGrowth + (terminalGrowth - initialGrowth) * t;
  });

  const methods: MethodResult[] = [];
  const skipped: Array<{ method: string; reason: string }> = [];

  try {
    methods.push(
      dcfValuation({
        baseFreeCashFlow: latest.freeCashFlow ?? 0,
        growthRates,
        wacc: sectorRefs.wacc,
        terminalGrowth,
        netDebt,
      }),
    );
  } catch (error) {
    if (!(error instanceof NotApplicableError)) throw error;
    skipped.push({ method: "dcf", reason: error.reason });
  }

  try {
    methods.push(
      comparablesValuation({
        metric: latest.ebitda ?? 0,
        multiple: sectorRefs.evEbitda,
        netDebt,
      }),
    );
  } catch (error) {
    if (!(error instanceof NotApplicableError)) throw error;
    skipped.push({ method: "comparables", reason: error.reason });
  }

  try {
    methods.push(
      marketMultiplesValuation({
        metric: latest.revenue ?? 0,
        multiple: sectorRefs.evRevenue,
        netDebt,
      }),
    );
  } catch (error) {
    if (!(error instanceof NotApplicableError)) throw error;
    skipped.push({ method: "market_multiples", reason: error.reason });
  }

  return {
    sector: sectorRefs,
    methods,
    aggregated: aggregateValuation(methods, skipped),
    assumptions,
  };
}
