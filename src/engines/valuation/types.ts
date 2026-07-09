/** All monetary amounts are EUR. Rates are decimals (0.10 = 10%). */

export interface Range {
  low: number;
  mid: number;
  high: number;
}

export interface DcfInputs {
  /** Most recent yearly free cash flow (must be > 0 for DCF to apply). */
  baseFreeCashFlow: number;
  /** Year-over-year growth per explicit forecast year, in order. */
  growthRates: number[];
  /** Discount rate; must exceed terminalGrowth. */
  wacc: number;
  terminalGrowth: number;
  /** Financial debt minus cash; subtracted from EV to get equity value. */
  netDebt: number;
}

export interface DcfResult {
  method: "dcf";
  enterpriseValue: number;
  equityValue: number;
  /** Discounted explicit-period cash flows, per year. */
  presentValues: number[];
  /** Discounted terminal value. */
  terminalValuePresent: number;
  assumptions: string[];
}

export interface MultipleInputs {
  /** EBITDA (comparables) or revenue (market multiples), latest fiscal year. */
  metric: number;
  multiple: Range;
  netDebt: number;
}

export interface MultipleResult {
  method: "comparables" | "market_multiples";
  /** Equity value range (EV range minus net debt, floored at 0). */
  equity: Range;
  assumptions: string[];
}

export type MethodResult = DcfResult | MultipleResult;

export interface AggregatedValuation {
  /** Union of the applicable methods' equity ranges. */
  low: number;
  mid: number;
  high: number;
  methodsUsed: string[];
  /** Methods that could not run, with the reason. */
  methodsSkipped: Array<{ method: string; reason: string }>;
}

/** Reference data shape (config/valuation-refs.v*.json). */
export interface SectorRefs {
  label: string;
  aliases: string[];
  wacc: number;
  evEbitda: Range;
  evRevenue: Range;
}

export interface ValuationRefs {
  version: string;
  note: string;
  discounting: { forecastYears: number; terminalGrowth: number };
  growthClamp: { min: number; max: number };
  sectors: Record<string, SectorRefs>;
}

/** One fiscal year of financials, EUR. Missing metrics are null. */
export interface FinancialYear {
  fiscalYear: number;
  revenue: number | null;
  ebitda: number | null;
  netIncome: number | null;
  netDebt: number | null;
  freeCashFlow: number | null;
}
