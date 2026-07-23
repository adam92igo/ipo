import type {
  Range,
  ShareInputs,
  SharePriceRange,
  SharePriceResult,
} from "./types";

export type * from "./types";

/** Thrown when the inputs don't allow a price to be computed. */
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
 * Indicative price per share, pre- and post-IPO dilution.
 *
 * - Pre-money  : equity / existing shares.
 * - Post-money : equity / (existing + new shares issued).
 * - Dilution   : new / (existing + new).
 *
 * Pure: no I/O, no AI, no dates. Same inputs => same output.
 * Note: this is an INDICATIVE value (the equity value is already a
 * range), not an offer price — that is set at bookbuilding.
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
      "the equity range must be ordered low <= mid <= high",
    );

  const totalShares = existingShares + newShares;
  const preMoney = pricePerShare(equity, existingShares);
  const postMoney = pricePerShare(equity, totalShares);
  const dilution = newShares === 0 ? 0 : round2(newShares / totalShares);
  // Indicative gross proceeds: new shares valued at the post-money mid price.
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
