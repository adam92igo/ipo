import { computeScores, normalizeAnswer } from "@/engines/scoring";
import type { Answers, Questionnaire } from "@/engines/scoring/types";
import type { RoadmapItemSpec, RoadmapPriority, RoadmapRules } from "./types";

export type * from "./types";

const PRIORITY_RANK: Record<RoadmapPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/**
 * Pure rules engine: evaluates every rule against the completed answers and
 * returns the ordered action plan. Question triggers compare the normalized
 * answer to belowNorm (strict); category triggers compare the weighted
 * category score to belowScore (strict). Rules referencing unknown questions
 * or categories are skipped (cross-config consistency is enforced by tests).
 * Ordering: priority rank, then rule order in the config file.
 */
export function generateRoadmap({
  rules,
  questionnaire,
  answers,
}: {
  rules: RoadmapRules;
  questionnaire: Questionnaire;
  answers: Answers;
}): RoadmapItemSpec[] {
  const questionIndex = new Map(
    questionnaire.categories.flatMap((c) => c.questions.map((q) => [q.id, q] as const)),
  );
  // Category scores are only needed if a category rule exists.
  const hasCategoryRule = rules.rules.some((r) => r.trigger.type === "category");
  const categoryScores = hasCategoryRule
    ? new Map(
        computeScores(questionnaire, answers).categories.map((c) => [c.id, c.score]),
      )
    : new Map<string, number>();

  const fired = rules.rules.filter((rule) => {
    if (rule.trigger.type === "question") {
      const question = questionIndex.get(rule.trigger.questionId);
      if (!question) return false;
      const value = answers[rule.trigger.questionId];
      if (value === undefined) return false;
      return normalizeAnswer(question, value) < rule.trigger.belowNorm;
    }
    const score = categoryScores.get(rule.trigger.categoryId);
    if (score === undefined) return false;
    return score < rule.trigger.belowScore;
  });

  return fired
    .map((rule, configOrder) => ({ rule, configOrder }))
    .sort(
      (a, b) =>
        PRIORITY_RANK[a.rule.priority] - PRIORITY_RANK[b.rule.priority] ||
        a.configOrder - b.configOrder,
    )
    .map(({ rule }, index) => ({
      ruleId: rule.id,
      title: rule.title,
      description: rule.description,
      categoryId: rule.category,
      priority: rule.priority,
      estimatedWeeks: rule.estimatedWeeks,
      sortOrder: index,
      reference: rule.reference ?? null,
    }));
}
