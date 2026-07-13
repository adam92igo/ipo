import { describe, expect, it } from "vitest";
import type { Questionnaire } from "@/engines/scoring";
import { readStoredReadinessScores } from "./assessment-snapshot";

const questionnaire: Questionnaire = {
  version: "test-v1",
  scaleLabels: ["0", "1", "2", "3", "4"],
  thresholds: { strength: 75, weakness: 40 },
  categories: [
    { id: "governance", label: "Governance", weight: 1, questions: [] },
    { id: "finance", label: "Finance", weight: 1, questions: [] },
  ],
};

describe("readStoredReadinessScores", () => {
  it("returns questionnaire-ordered frozen scores for a complete snapshot", () => {
    expect(
      readStoredReadinessScores(questionnaire, {
        globalScore: "65",
        categoryScores: { finance: 60, governance: 70 },
      }),
    ).toEqual({
      globalScore: 65,
      categoryScores: { governance: 70, finance: 60 },
      categories: [
        { id: "governance", label: "Governance", score: 70 },
        { id: "finance", label: "Finance", score: 60 },
      ],
    });
  });

  it("rejects a null global score instead of coercing it to zero", () => {
    expect(
      readStoredReadinessScores(questionnaire, {
        globalScore: null,
        categoryScores: { governance: 70, finance: 60 },
      }),
    ).toBeNull();
  });

  it("rejects a non-finite global score", () => {
    expect(
      readStoredReadinessScores(questionnaire, {
        globalScore: "NaN",
        categoryScores: { governance: 70, finance: 60 },
      }),
    ).toBeNull();
  });

  it("rejects a snapshot with a missing questionnaire category", () => {
    expect(
      readStoredReadinessScores(questionnaire, {
        globalScore: "65",
        categoryScores: { governance: 70 },
      }),
    ).toBeNull();
  });

  it("rejects scores outside the zero-to-one-hundred range", () => {
    expect(
      readStoredReadinessScores(questionnaire, {
        globalScore: "101",
        categoryScores: { governance: 70, finance: -1 },
      }),
    ).toBeNull();
  });
});
