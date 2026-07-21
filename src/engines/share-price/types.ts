/** Montants en EUR. Prix indicatif par action à partir de la valeur equity. */

import type { Range } from "@/engines/valuation/types";

export type { Range };

export interface ShareInputs {
  /** Fourchette de valeur des capitaux propres (equity), EUR. */
  equity: Range;
  /** Number of existing shares (pre-IPO), > 0. */
  existingShares: number;
  /**
   * New shares issued in the IPO capital increase (>= 0).
   * 0 => pas de dilution, le prix post-IPO égale le prix pré-IPO.
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
  /** Prix avant IPO : equity / actions existantes. */
  preMoney: SharePriceRange;
  /** Prix après IPO : equity / (existantes + nouvelles). */
  postMoney: SharePriceRange;
  /** Dilution des actionnaires existants, en fraction (0.2 = 20%). */
  dilution: number;
  /** Produit brut indicatif levé (new shares × prix post-money mid), EUR. */
  grossProceedsMid: number;
  assumptions: string[];
}
