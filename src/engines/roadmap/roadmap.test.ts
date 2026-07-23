import { describe, expect, it } from "vitest";
import type { Questionnaire } from "@/engines/scoring/types";
import { generateRoadmap } from "./index";
import type { RoadmapRules } from "./types";

/**
 * Fixture: catA (q1 yes_no), catB (q2 scale_0_4), equal weights.
 * Answers q1=false (norm 0), q2=2 (norm 0.5) -> catA=0, catB=50.
 */
const questionnaire: Questionnaire = {
  version: "test-1",
  scaleLabels: ["0", "1", "2", "3", "4"],
  thresholds: { strength: 75, weakness: 60 },
  categories: [
    {
      id: "catA",
      label: "Category A",
      weight: 50,
      questions: [{ id: "q1", text: "Q1", type: "yes_no", weight: 1 }],
    },
    {
      id: "catB",
      label: "Category B",
      weight: 50,
      questions: [{ id: "q2", text: "Q2", type: "scale_0_4", weight: 1 }],
    },
  ],
};

const rules: RoadmapRules = {
  version: "test-1",
  note: "",
  rules: [
    { id: "r1", title: "Fix Q1", description: "d1", category: "catA", priority: "critical", estimatedWeeks: 8, trigger: { type: "question", questionId: "q1", belowNorm: 1 }, reference: "Code de commerce, art. L. 227-2" },
    { id: "r2", title: "Improve Q2 a lot", description: "d2", category: "catB", priority: "high", estimatedWeeks: 4, trigger: { type: "question", questionId: "q2", belowNorm: 0.5 } },
    { id: "r3", title: "Rescue category B", description: "d3", category: "catB", priority: "critical", estimatedWeeks: 12, trigger: { type: "category", categoryId: "catB", belowScore: 60 } },
    { id: "r4", title: "Polish Q2", description: "d4", category: "catB", priority: "low", estimatedWeeks: 2, trigger: { type: "question", questionId: "q2", belowNorm: 1 } },
  ],
};

const answers = { q1: false, q2: 2 };

describe("generateRoadmap", () => {
  it("fires question rules below the norm threshold and category rules below the score", () => {
    const items = generateRoadmap({ rules, questionnaire, answers });
    // r1: norm 0 < 1 fires. r2: norm 0.5 < 0.5 is FALSE (strict). r3: 50 < 60 fires. r4: 0.5 < 1 fires.
    expect(items.map((i) => i.ruleId)).toEqual(["r1", "r3", "r4"]);
  });

  it("orders by priority then rule order, with contiguous sortOrder", () => {
    const items = generateRoadmap({ rules, questionnaire, answers });
    expect(items.map((i) => i.priority)).toEqual(["critical", "critical", "low"]);
    expect(items.map((i) => i.sortOrder)).toEqual([0, 1, 2]);
    expect(items[0]).toMatchObject({
      ruleId: "r1",
      title: "Fix Q1",
      categoryId: "catA",
      estimatedWeeks: 8,
    });
  });

  it("returns an empty plan when every answer is perfect", () => {
    expect(
      generateRoadmap({ rules, questionnaire, answers: { q1: true, q2: 4 } }),
    ).toEqual([]);
  });

  it("is deterministic", () => {
    expect(generateRoadmap({ rules, questionnaire, answers })).toEqual(
      generateRoadmap({ rules, questionnaire, answers }),
    );
  });

  it("carries the regulatory reference through when the rule has one, null otherwise", () => {
    const items = generateRoadmap({ rules, questionnaire, answers });
    const byRule = new Map(items.map((i) => [i.ruleId, i.reference]));
    expect(byRule.get("r1")).toBe("Code de commerce, art. L. 227-2");
    expect(byRule.get("r3")).toBeNull();
    expect(byRule.get("r4")).toBeNull();
  });

  it("skips rules pointing at unknown questions or categories", () => {
    const stray: RoadmapRules = {
      ...rules,
      rules: [
        { id: "rx", title: "Ghost", description: "d", category: "catA", priority: "critical", estimatedWeeks: 1, trigger: { type: "question", questionId: "nope", belowNorm: 1 } },
        { id: "ry", title: "Ghost cat", description: "d", category: "catA", priority: "critical", estimatedWeeks: 1, trigger: { type: "category", categoryId: "nope", belowScore: 100 } },
      ],
    };
    expect(generateRoadmap({ rules: stray, questionnaire, answers })).toEqual([]);
  });
});
