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

/** Divise une fourchette equity par un nombre d'actions (prix par action). */
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
 * Note : c'est une valeur INDICATIVE (la valeur equity est déjà une
 * fourchette), pas un prix d'offre — celui-ci est fixé par le bookbuilding.
 */
export function computeSharePrice(inputs: ShareInputs): SharePriceResult {
  const { equity, existingShares, newShares } = inputs;

  if (!Number.isFinite(existingShares) || existingShares <= 0)
    throw new InvalidShareInputError(
      "le nombre d'actions existantes doit être strictement positif",
    );
  if (!Number.isFinite(newShares) || newShares < 0)
    throw new InvalidShareInputError(
      "le nombre de nouvelles actions ne peut pas être négatif",
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
    `Prix pré-money = valeur equity ÷ ${round0(existingShares).toLocaleString("fr-FR")} actions existantes`,
  ];
  if (newShares > 0) {
    assumptions.push(
      `Prix post-money = valeur equity ÷ ${round0(totalShares).toLocaleString("fr-FR")} actions (dilution ${pct(dilution)})`,
      `Produit brut indicatif ≈ ${grossProceedsMid.toLocaleString("fr-FR")} EUR (mid)`,
    );
  } else {
    assumptions.push("Aucune nouvelle action émise — prix post-money = pré-money");
  }
  assumptions.push(
    "Valeur indicative dérivée d'une fourchette d'estimation ; le prix d'offre réel est fixé au bookbuilding.",
  );

  return { preMoney, postMoney, dilution, grossProceedsMid, assumptions };
}
