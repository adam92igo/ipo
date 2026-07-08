import { describe, expect, it } from "vitest";
import { computeScores } from "@/engines/scoring";
import {
  CURRENT_QUESTIONNAIRE_VERSION,
  getQuestionnaire,
} from "./questionnaire";

describe("questionnaire v1 config", () => {
  const questionnaire = getQuestionnaire(CURRENT_QUESTIONNAIRE_VERSION);

  it("has the five spec categories, weights summing to 100", () => {
    expect(questionnaire.categories.map((c) => c.id)).toEqual([
      "governance",
      "finance",
      "growth",
      "compliance",
      "reporting",
    ]);
    expect(questionnaire.categories.reduce((s, c) => s + c.weight, 0)).toBe(100);
  });

  it("has between 80 and 120 questions (spec range)", () => {
    const count = questionnaire.categories.reduce(
      (sum, c) => sum + c.questions.length,
      0,
    );
    expect(count).toBeGreaterThanOrEqual(80);
    expect(count).toBeLessThanOrEqual(120);
  });

  it("rejects unknown versions", () => {
    expect(() => getQuestionnaire("v999")).toThrow(/Unknown questionnaire version/);
  });

  it("yields 100 for all-best answers and 0 for all-worst answers", () => {
    const best: Record<string, boolean | number | string> = {};
    const worst: Record<string, boolean | number | string> = {};
    for (const category of questionnaire.categories) {
      for (const q of category.questions) {
        if (q.type === "yes_no") {
          best[q.id] = true;
          worst[q.id] = false;
        } else if (q.type === "scale_0_4") {
          best[q.id] = 4;
          worst[q.id] = 0;
        } else {
          const sorted = [...q.choices!].sort((a, b) => b.value - a.value);
          best[q.id] = sorted[0].id;
          worst[q.id] = sorted[sorted.length - 1].id;
        }
      }
    }
    expect(computeScores(questionnaire, best).global).toBe(100);
    expect(computeScores(questionnaire, worst).global).toBe(0);
  });

  it("every single_choice question has a best choice worth 1", () => {
    for (const category of questionnaire.categories) {
      for (const q of category.questions) {
        if (q.type === "single_choice") {
          expect(
            Math.max(...q.choices!.map((c) => c.value)),
            `question ${q.id} should have a full-credit choice`,
          ).toBe(1);
        }
      }
    }
  });
});
