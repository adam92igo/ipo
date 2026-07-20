/** Montants en EUR. Prix indicatif par action à partir de la valeur equity. */

import type { Range } from "@/engines/valuation/types";

export type { Range };

export interface ShareInputs {
  /** Fourchette de valeur des capitaux propres (equity), EUR. */
  equity: Range;
  /** Nombre d'actions existantes (avant IPO), > 0. */
  existingShares: number;
  /**
   * Nouvelles actions émises lors de l'augmentation de capital IPO (>= 0).
   * 0 => pas de dilution, le prix post-IPO égale le prix pré-IPO.
   */
  newShares: number;
}

/** Prix par action pour une base d'actions donnée (fourchette). */
export interface SharePriceRange {
  /** Base d'actions utilisée pour ce prix. */
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
