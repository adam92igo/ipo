import { describe, expect, it } from "vitest";
import {
  CURRENT_QUESTIONNAIRE_VERSION,
  getQuestionnaire,
} from "./questionnaire";
import { CURRENT_ROADMAP_RULES_VERSION, getRoadmapRules } from "./roadmap-rules";

describe("roadmap rules current config", () => {
  const rules = getRoadmapRules(CURRENT_ROADMAP_RULES_VERSION);
  const questionnaire = getQuestionnaire(CURRENT_QUESTIONNAIRE_VERSION);
  const questionIds = new Set(
    questionnaire.categories.flatMap((c) => c.questions.map((q) => q.id)),
  );
  const categoryIds = new Set(questionnaire.categories.map((c) => c.id));

  it("references only questions and categories that exist in the current questionnaire", () => {
    for (const rule of rules.rules) {
      if (rule.trigger.type === "question") {
        expect(questionIds.has(rule.trigger.questionId), `rule ${rule.id}`).toBe(true);
      } else {
        expect(categoryIds.has(rule.trigger.categoryId), `rule ${rule.id}`).toBe(true);
      }
      expect(categoryIds.has(rule.category), `rule ${rule.id} display category`).toBe(
        true,
      );
    }
  });

  it("covers every questionnaire category with at least one rule", () => {
    const covered = new Set(rules.rules.map((r) => r.category));
    for (const id of categoryIds) expect(covered.has(id), id).toBe(true);
  });

  it("rejects unknown versions", () => {
    expect(() => getRoadmapRules("v999")).toThrow(/Unknown roadmap rules version/);
  });
});
