/** Amounts in EUR. Indicative price per share derived from the equity value. */

import type { Range } from "@/engines/valuation/types";

export type { Range };

export interface ShareInputs {
  /** Equity value range, EUR. */
  equity: Range;
  /** Number of existing shares (pre-IPO), > 0. */
  existingShares: number;
  /**
   * New shares issued in the IPO capital increase (>= 0).
   * 0 => no dilution, the post-IPO price equals the pre-IPO price.
   */
  newShares: number;
}

/** Price per share for a given share base (range). */
export interface SharePriceRange {
  /** Share base used for this price. */
  shareCount: number;
  low: number;
  mid: number;
  high: number;
}

export interface SharePriceResult {
  /** Price before IPO: equity / existing shares. */
  preMoney: SharePriceRange;
  /** Price after IPO: equity / (existing + new shares). */
  postMoney: SharePriceRange;
  /** Dilution of existing shareholders, as a fraction (0.2 = 20%). */
  dilution: number;
  /** Indicative gross proceeds raised (new shares × post-money mid price), EUR. */
  grossProceedsMid: number;
  assumptions: string[];
}
