import { describe, expect, it } from "vitest";
import {
  InvalidAnswerError,
  MissingAnswersError,
  buildRestitution,
  computeScores,
  getProgress,
  normalizeAnswer,
} from "./index";
import type { Question, Questionnaire } from "./types";

const q = (partial: Partial<Question> & Pick<Question, "id" | "type" | "weight">): Question => ({
  text: `Question ${partial.id}`,
  ...partial,
});

/**
 * Hand-computed fixture:
 *  catA (weight 60): q1 yes_no w2, q2 scale_0_4 w1, q3 single_choice w1
 *  catB (weight 40): q4 yes_no w1
 * Answers q1=true(1), q2=2(0.5), q3="half"(0.5), q4=false(0):
 *  catA = (1*2 + 0.5*1 + 0.5*1) / 4 = 0.75 -> 75
 *  catB = 0 -> 0
 *  global = (75*60 + 0*40) / 100 = 45
 */
const fixture: Questionnaire = {
  version: "test-1",
  thresholds: { strength: 75, weakness: 60 },
  categories: [
    {
      id: "catA",
      label: "Category A",
      weight: 60,
      questions: [
        q({ id: "q1", type: "yes_no", weight: 2, actionLabel: "Fix q1" }),
        q({ id: "q2", type: "scale_0_4", weight: 1, actionLabel: "Fix q2" }),
        q({
          id: "q3",
          type: "single_choice",
          weight: 1,
          actionLabel: "Fix q3",
          choices: [
            { id: "full", label: "Full", value: 1 },
            { id: "half", label: "Half", value: 0.5 },
            { id: "none", label: "None", value: 0 },
          ],
        }),
      ],
    },
    {
      id: "catB",
      label: "Category B",
      weight: 40,
      questions: [q({ id: "q4", type: "yes_no", weight: 1, actionLabel: "Fix q4" })],
    },
  ],
};

const completeAnswers = { q1: true, q2: 2, q3: "half", q4: false };

describe("normalizeAnswer", () => {
  const yesNo = q({ id: "x", type: "yes_no", weight: 1 });
  const scale = q({ id: "x", type: "scale_0_4", weight: 1 });
  const choice = q({
    id: "x",
    type: "single_choice",
    weight: 1,
    choices: [
      { id: "a", label: "A", value: 1 },
      { id: "b", label: "B", value: 0.25 },
    ],
  });

  it("maps yes_no booleans to 1/0", () => {
    expect(normalizeAnswer(yesNo, true)).toBe(1);
    expect(normalizeAnswer(yesNo, false)).toBe(0);
  });

  it("rejects non-boolean yes_no values", () => {
    expect(() => normalizeAnswer(yesNo, 1)).toThrow(InvalidAnswerError);
    expect(() => normalizeAnswer(yesNo, "yes")).toThrow(InvalidAnswerError);
  });

  it("maps scale_0_4 integers onto [0,1] quarters", () => {
    expect(normalizeAnswer(scale, 0)).toBe(0);
    expect(normalizeAnswer(scale, 1)).toBe(0.25);
    expect(normalizeAnswer(scale, 3)).toBe(0.75);
    expect(normalizeAnswer(scale, 4)).toBe(1);
  });

  it("rejects out-of-range or non-integer scale values", () => {
    expect(() => normalizeAnswer(scale, -1)).toThrow(InvalidAnswerError);
    expect(() => normalizeAnswer(scale, 5)).toThrow(InvalidAnswerError);
    expect(() => normalizeAnswer(scale, 2.5)).toThrow(InvalidAnswerError);
    expect(() => normalizeAnswer(scale, "2")).toThrow(InvalidAnswerError);
    expect(() => normalizeAnswer(scale, true)).toThrow(InvalidAnswerError);
  });

  it("maps single_choice ids to their configured value", () => {
    expect(normalizeAnswer(choice, "a")).toBe(1);
    expect(normalizeAnswer(choice, "b")).toBe(0.25);
  });

  it("rejects unknown choice ids and non-string values", () => {
    expect(() => normalizeAnswer(choice, "z")).toThrow(InvalidAnswerError);
    expect(() => normalizeAnswer(choice, 0)).toThrow(InvalidAnswerError);
  });
});

describe("computeScores", () => {
  it("computes weighted category scores and the weighted global score", () => {
    const result = computeScores(fixture, completeAnswers);
    expect(result).toEqual({
      version: "test-1",
      global: 45,
      categories: [
        { id: "catA", label: "Category A", score: 75 },
        { id: "catB", label: "Category B", score: 0 },
      ],
    });
  });

  it("rounds scores to one decimal", () => {
    // catA: q1=false(0*2) q2=1(0.25) q3=half(0.5) -> 0.75/4 = 0.1875 -> 18.8
    const result = computeScores(fixture, { q1: false, q2: 1, q3: "half", q4: true });
    expect(result.categories[0].score).toBe(18.8);
    // global = (18.75*60 + 100*40)/100 = 51.25 -> rounded from raw values: 51.3
    expect(result.global).toBe(51.3);
  });

  it("is deterministic for identical inputs", () => {
    expect(computeScores(fixture, completeAnswers)).toEqual(
      computeScores(fixture, completeAnswers),
    );
  });

  it("throws MissingAnswersError listing every unanswered question", () => {
    expect(() => computeScores(fixture, { q1: true })).toThrow(MissingAnswersError);
    try {
      computeScores(fixture, { q1: true });
    } catch (error) {
      expect((error as MissingAnswersError).missingQuestionIds).toEqual([
        "q2",
        "q3",
        "q4",
      ]);
    }
  });

  it("ignores answers to unknown question ids", () => {
    const result = computeScores(fixture, { ...completeAnswers, ghost: true });
    expect(result.global).toBe(45);
  });

  it("propagates InvalidAnswerError for malformed stored answers", () => {
    expect(() => computeScores(fixture, { ...completeAnswers, q2: 99 })).toThrow(
      InvalidAnswerError,
    );
  });
});

describe("getProgress", () => {
  it("counts answered questions per category", () => {
    expect(getProgress(fixture, { q1: true, q3: "none" })).toEqual({
      answered: 2,
      total: 4,
      byCategory: [
        { id: "catA", answered: 2, total: 3 },
        { id: "catB", answered: 0, total: 1 },
      ],
    });
  });

  it("does not count unknown ids as progress", () => {
    expect(getProgress(fixture, { ghost: true }).answered).toBe(0);
  });
});

describe("buildRestitution", () => {
  it("classifies categories by thresholds (strength >= 75, weakness < 60)", () => {
    const r = buildRestitution(fixture, completeAnswers);
    expect(r.strengths.map((c) => c.id)).toEqual(["catA"]);
    expect(r.weaknesses.map((c) => c.id)).toEqual(["catB"]);
  });

  it("leaves mid-range categories out of both lists", () => {
    // catA: q1=true(2) q2=4(1) q3=none(0) -> 3/4 = 75 (strength, boundary)
    // catB: irrelevant here
    const r = buildRestitution(fixture, { q1: true, q2: 4, q3: "none", q4: true });
    expect(r.strengths.map((c) => c.id)).toEqual(["catA", "catB"]);
    expect(r.weaknesses).toEqual([]);

    // catA: q1=true(2) q2=2(0.5) q3=none(0) -> 2.5/4 = 62.5 -> neither list
    const mid = buildRestitution(fixture, { q1: true, q2: 2, q3: "none", q4: true });
    expect(mid.strengths.map((c) => c.id)).toEqual(["catB"]);
    expect(mid.weaknesses).toEqual([]);
  });

  it("ranks priority actions by impact = weight x (1 - normalized answer)", () => {
    // impacts: q1 0 (excluded, fully satisfied), q2 1*(1-0.5)=0.5,
    //          q3 1*(1-0.5)=0.5, q4 1*(1-0)=1
    const r = buildRestitution(fixture, completeAnswers);
    expect(r.priorityActions.map((a) => a.questionId)).toEqual(["q4", "q2", "q3"]);
    expect(r.priorityActions[0]).toEqual({
      questionId: "q4",
      categoryId: "catB",
      actionLabel: "Fix q4",
      impact: 1,
    });
  });

  it("breaks impact ties by questionnaire order (category, then question)", () => {
    // q2 and q3 both have impact 0.5 and sit in catA in that order.
    const r = buildRestitution(fixture, completeAnswers);
    const tied = r.priorityActions.filter((a) => a.impact === 0.5);
    expect(tied.map((a) => a.questionId)).toEqual(["q2", "q3"]);
  });

  it("skips questions without an actionLabel and caps the list", () => {
    const noLabel: Questionnaire = {
      ...fixture,
      categories: [
        {
          id: "catA",
          label: "Category A",
          weight: 100,
          questions: [
            q({ id: "q1", type: "yes_no", weight: 5 }), // no actionLabel
            q({ id: "q2", type: "yes_no", weight: 1, actionLabel: "Fix q2" }),
            q({ id: "q3", type: "yes_no", weight: 2, actionLabel: "Fix q3" }),
            q({ id: "q4", type: "yes_no", weight: 3, actionLabel: "Fix q4" }),
          ],
        },
      ],
    };
    const r = buildRestitution(
      noLabel,
      { q1: false, q2: false, q3: false, q4: false },
      { maxActions: 2 },
    );
    expect(r.priorityActions.map((a) => a.questionId)).toEqual(["q4", "q3"]);
  });
});
