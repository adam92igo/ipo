import type {
  Answers,
  AnswerValue,
  CategoryScore,
  PriorityAction,
  Progress,
  Question,
  Questionnaire,
  Restitution,
  ScoreResult,
} from "./types";

export type * from "./types";

export class InvalidAnswerError extends Error {
  constructor(questionId: string, value: unknown) {
    super(`Invalid answer for question "${questionId}": ${JSON.stringify(value)}`);
    this.name = "InvalidAnswerError";
  }
}

export class MissingAnswersError extends Error {
  constructor(public readonly missingQuestionIds: string[]) {
    super(`Missing answers for ${missingQuestionIds.length} question(s)`);
    this.name = "MissingAnswersError";
  }
}

const round1 = (x: number) => Math.round(x * 10) / 10;

/** Maps a raw stored answer onto [0, 1] according to the question type. */
export function normalizeAnswer(question: Question, value: AnswerValue): number {
  switch (question.type) {
    case "yes_no":
      if (typeof value !== "boolean") throw new InvalidAnswerError(question.id, value);
      return value ? 1 : 0;
    case "scale_0_4":
      if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 4)
        throw new InvalidAnswerError(question.id, value);
      return value / 4;
    case "single_choice": {
      if (typeof value !== "string") throw new InvalidAnswerError(question.id, value);
      const choice = question.choices?.find((c) => c.id === value);
      if (!choice) throw new InvalidAnswerError(question.id, value);
      return choice.value;
    }
  }
}

/**
 * Category score = sum(normalized x weight) / sum(weight), as a percentage.
 * Global score = weighted average of raw category scores (rounding applied
 * only to the published numbers, never to intermediates).
 * Requires every question answered; throws MissingAnswersError otherwise.
 */
export function computeScores(
  questionnaire: Questionnaire,
  answers: Answers,
): ScoreResult {
  const missing = questionnaire.categories
    .flatMap((c) => c.questions)
    .filter((q) => !(q.id in answers))
    .map((q) => q.id);
  if (missing.length > 0) throw new MissingAnswersError(missing);

  const rawByCategory = questionnaire.categories.map((category) => {
    let weighted = 0;
    let totalWeight = 0;
    for (const question of category.questions) {
      weighted += normalizeAnswer(question, answers[question.id]) * question.weight;
      totalWeight += question.weight;
    }
    return { category, raw: (weighted / totalWeight) * 100 };
  });

  const totalCategoryWeight = questionnaire.categories.reduce(
    (sum, c) => sum + c.weight,
    0,
  );
  const globalRaw =
    rawByCategory.reduce((sum, { category, raw }) => sum + raw * category.weight, 0) /
    totalCategoryWeight;

  return {
    version: questionnaire.version,
    global: round1(globalRaw),
    categories: rawByCategory.map(({ category, raw }) => ({
      id: category.id,
      label: category.label,
      score: round1(raw),
    })),
  };
}

/** Answered-question counts for the multi-step form's progress display. */
export function getProgress(questionnaire: Questionnaire, answers: Answers): Progress {
  const byCategory = questionnaire.categories.map((category) => ({
    id: category.id,
    answered: category.questions.filter((q) => q.id in answers).length,
    total: category.questions.length,
  }));
  return {
    answered: byCategory.reduce((sum, c) => sum + c.answered, 0),
    total: byCategory.reduce((sum, c) => sum + c.total, 0),
    byCategory,
  };
}

/**
 * Rules-based restitution (no AI):
 * - strengths: category score >= thresholds.strength
 * - weaknesses: category score < thresholds.weakness
 * - priority actions: questions with an actionLabel, ranked by
 *   impact = weight x (1 - normalized answer), ties broken by questionnaire
 *   order (category, then question), capped at maxActions.
 */
export function buildRestitution(
  questionnaire: Questionnaire,
  answers: Answers,
  options: { maxActions?: number } = {},
): Restitution {
  const scores = computeScores(questionnaire, answers);
  return {
    ...classifyCategories(scores.categories, questionnaire.thresholds),
    priorityActions: rankPriorityActions(questionnaire, answers, options),
  };
}

/**
 * Threshold classification over ALREADY-COMPUTED scores — lets callers reuse
 * the scores frozen at completion instead of recomputing from answers.
 */
export function classifyCategories(
  categories: CategoryScore[],
  thresholds: Questionnaire["thresholds"],
): { strengths: CategoryScore[]; weaknesses: CategoryScore[] } {
  const strengths: CategoryScore[] = [];
  const weaknesses: CategoryScore[] = [];
  for (const category of categories) {
    if (category.score >= thresholds.strength) strengths.push(category);
    else if (category.score < thresholds.weakness) weaknesses.push(category);
  }
  return { strengths, weaknesses };
}

/** Priority actions ranked by impact = weight x (1 - normalized answer). */
export function rankPriorityActions(
  questionnaire: Questionnaire,
  answers: Answers,
  options: { maxActions?: number } = {},
): PriorityAction[] {
  const { maxActions = 5 } = options;
  const candidates: PriorityAction[] = [];
  for (const category of questionnaire.categories) {
    for (const question of category.questions) {
      if (!question.actionLabel) continue;
      const value = answers[question.id];
      if (value === undefined) continue;
      const impact = question.weight * (1 - normalizeAnswer(question, value));
      if (impact <= 0) continue;
      candidates.push({
        questionId: question.id,
        categoryId: category.id,
        actionLabel: question.actionLabel,
        impact,
      });
    }
  }
  // Stable sort: equal impacts keep questionnaire order.
  return candidates.sort((a, b) => b.impact - a.impact).slice(0, maxActions);
}
