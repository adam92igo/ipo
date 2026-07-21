import type {
  Range,
  ShareInputs,
  SharePriceRange,
  SharePriceResult,
} from "./types";

export type * from "./types";

/** Levée quand les entrées ne permettent pas de calculer un prix. */
export class InvalidShareInputError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "InvalidShareInputError";
  }
}

const round2 = (x: number) => Math.round(x * 100) / 100;
const round0 = (x: number) => Math.round(x);
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

/** Divides an equity range by a number of shares (price per share). */
function pricePerShare(equity: Range, shareCount: number): SharePriceRange {
  return {
    shareCount,
    low: round2(equity.low / shareCount),
    mid: round2(equity.mid / shareCount),
    high: round2(equity.high / shareCount),
  };
}

/**
 * Prix indicatif par action, avant et après dilution IPO.
 *
 * - Pré-money  : equity / actions existantes.
 * - Post-money : equity / (existantes + nouvelles actions émises).
 * - Dilution   : nouvelles / (existantes + nouvelles).
 *
 * Pur : pas d'I/O, pas d'IA, pas de dates. Mêmes entrées => même sortie.
 * Note: this is an INDICATIVE value (the equity value is already an
 * fourchette), pas un prix d'offre — celui-ci est fixé par le bookbuilding.
 */
export function computeSharePrice(inputs: ShareInputs): SharePriceResult {
  const { equity, existingShares, newShares } = inputs;

  if (!Number.isFinite(existingShares) || existingShares <= 0)
    throw new InvalidShareInputError(
      "the number of existing shares must be strictly positive",
    );
  if (!Number.isFinite(newShares) || newShares < 0)
    throw new InvalidShareInputError(
      "the number of new shares cannot be negative",
    );
  if (equity.low > equity.mid || equity.mid > equity.high)
    throw new InvalidShareInputError(
      "la fourchette equity doit être ordonnée low <= mid <= high",
    );

  const totalShares = existingShares + newShares;
  const preMoney = pricePerShare(equity, existingShares);
  const postMoney = pricePerShare(equity, totalShares);
  const dilution = newShares === 0 ? 0 : round2(newShares / totalShares);
  // Produit brut indicatif : nouvelles actions valorisées au prix post-money mid.
  const grossProceedsMid = round0(newShares * postMoney.mid);

  const assumptions: string[] = [
    `Pre-money price = equity value ÷ ${round0(existingShares).toLocaleString("en-GB")} existing shares`,
  ];
  if (newShares > 0) {
    assumptions.push(
      `Post-money price = equity value ÷ ${round0(totalShares).toLocaleString("en-GB")} shares (${pct(dilution)} dilution)`,
      `Indicative gross proceeds ≈ ${grossProceedsMid.toLocaleString("en-GB")} EUR (mid)`,
    );
  } else {
    assumptions.push("No new shares issued — post-money price = pre-money");
  }
  assumptions.push(
    "Indicative value derived from an estimate range; the actual offer price is set at bookbuilding.",
  );

  return { preMoney, postMoney, dilution, grossProceedsMid, assumptions };
}
