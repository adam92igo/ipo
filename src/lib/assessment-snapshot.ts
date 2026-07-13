import type { CategoryScore, Questionnaire } from "@/engines/scoring";

export type StoredReadinessScores = {
  globalScore: number;
  categoryScores: Record<string, number>;
  categories: CategoryScore[];
};

type StoredReadinessInput = {
  globalScore: unknown;
  categoryScores: unknown;
};

function readScore(value: unknown): number | null {
  if (
    value === null ||
    value === undefined ||
    (typeof value !== "number" && typeof value !== "string") ||
    (typeof value === "string" && value.trim() === "")
  ) {
    return null;
  }
  const score = Number(value);
  return Number.isFinite(score) && score >= 0 && score <= 100 ? score : null;
}

/**
 * Reads the immutable scores stored when an assessment completed.
 * Invalid legacy rows stay unavailable; missing values are never invented as zero.
 */
export function readStoredReadinessScores(
  questionnaire: Pick<Questionnaire, "categories">,
  snapshot: StoredReadinessInput,
): StoredReadinessScores | null {
  const globalScore = readScore(snapshot.globalScore);
  if (
    globalScore === null ||
    snapshot.categoryScores === null ||
    typeof snapshot.categoryScores !== "object" ||
    Array.isArray(snapshot.categoryScores)
  ) {
    return null;
  }

  const stored = snapshot.categoryScores as Record<string, unknown>;
  const categories: CategoryScore[] = [];
  const categoryScores: Record<string, number> = {};
  for (const category of questionnaire.categories) {
    if (!Object.prototype.hasOwnProperty.call(stored, category.id)) return null;
    const score = readScore(stored[category.id]);
    if (score === null || typeof stored[category.id] !== "number") return null;
    categories.push({ id: category.id, label: category.label, score });
    categoryScores[category.id] = score;
  }

  if (
    Object.values(stored).some(
      (score) => typeof score !== "number" || readScore(score) === null,
    )
  ) {
    return null;
  }
  return { globalScore, categoryScores, categories };
}
