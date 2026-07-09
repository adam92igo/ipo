import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { InvalidAnswerError, MissingAnswersError } from "@/engines/scoring";
import {
  CURRENT_QUESTIONNAIRE_VERSION,
  getQuestionnaire,
} from "../questionnaire";
import { migrateTestDb, seedOrgWithUser, truncateAll } from "../../test/db";
import {
  completeAssessment,
  getAnswers,
  getLatestAssessment,
  getLatestCompletedAssessment,
  getOrCreateActiveAssessment,
  saveAnswer,
} from "./assessments";
import { createCompany } from "./companies";
import { InvalidStateError, NotFoundError } from "./errors";

const questionnaire = getQuestionnaire(CURRENT_QUESTIONNAIRE_VERSION);

function bestAnswers(): Record<string, boolean | number | string> {
  const answers: Record<string, boolean | number | string> = {};
  for (const category of questionnaire.categories) {
    for (const q of category.questions) {
      if (q.type === "yes_no") answers[q.id] = true;
      else if (q.type === "scale_0_4") answers[q.id] = 4;
      else answers[q.id] = [...q.choices!].sort((a, b) => b.value - a.value)[0].id;
    }
  }
  return answers;
}

async function seedCompany(role: "owner" | "admin" | "member" = "owner") {
  const ctx = await seedOrgWithUser(role);
  const company = await createCompany(
    { ...ctx, role: "owner" },
    { name: "Acme SAS", sector: "Software", country: "FR" },
  );
  return { ctx, company };
}

describe("assessments data-access", () => {
  beforeAll(async () => {
    await migrateTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  it("creates an in_progress assessment bound to the org, company and current version", async () => {
    const { ctx, company } = await seedCompany();
    const assessment = await getOrCreateActiveAssessment(ctx, company.id);
    expect(assessment.organizationId).toBe(ctx.organizationId);
    expect(assessment.companyId).toBe(company.id);
    expect(assessment.status).toBe("in_progress");
    expect(assessment.questionnaireVersion).toBe(CURRENT_QUESTIONNAIRE_VERSION);
  });

  it("returns the same in_progress assessment on subsequent calls", async () => {
    const { ctx, company } = await seedCompany();
    const first = await getOrCreateActiveAssessment(ctx, company.id);
    const second = await getOrCreateActiveAssessment(ctx, company.id);
    expect(second.id).toBe(first.id);
  });

  it("refuses to start an assessment for another org's company", async () => {
    const { company } = await seedCompany();
    const other = await seedOrgWithUser("owner");
    await expect(getOrCreateActiveAssessment(other, company.id)).rejects.toThrow(
      NotFoundError,
    );
  });

  it("members can answer (fill diagnostics) — write is not owner/admin-gated", async () => {
    const { ctx, company } = await seedCompany();
    const memberCtx = { ...ctx, role: "member" as const };
    const assessment = await getOrCreateActiveAssessment(memberCtx, company.id);
    await saveAnswer(memberCtx, assessment.id, "gov-01", true);
    await expect(getAnswers(memberCtx, assessment.id)).resolves.toEqual({
      "gov-01": true,
    });
  });

  it("upserts answers per question (progress save)", async () => {
    const { ctx, company } = await seedCompany();
    const assessment = await getOrCreateActiveAssessment(ctx, company.id);
    await saveAnswer(ctx, assessment.id, "gov-02", 1);
    await saveAnswer(ctx, assessment.id, "gov-02", 3);
    await expect(getAnswers(ctx, assessment.id)).resolves.toEqual({ "gov-02": 3 });
  });

  it("rejects answers that fail engine validation or target unknown questions", async () => {
    const { ctx, company } = await seedCompany();
    const assessment = await getOrCreateActiveAssessment(ctx, company.id);
    await expect(saveAnswer(ctx, assessment.id, "gov-01", "yes")).rejects.toThrow(
      InvalidAnswerError,
    );
    await expect(saveAnswer(ctx, assessment.id, "nope-99", true)).rejects.toThrow(
      NotFoundError,
    );
  });

  it("rejects cross-org answer writes even with a valid assessment id", async () => {
    const { ctx, company } = await seedCompany();
    const assessment = await getOrCreateActiveAssessment(ctx, company.id);
    const other = await seedOrgWithUser("owner");
    await expect(saveAnswer(other, assessment.id, "gov-01", true)).rejects.toThrow(
      NotFoundError,
    );
    await expect(getAnswers(other, assessment.id)).rejects.toThrow(NotFoundError);
  });

  it("refuses completion while answers are missing", async () => {
    const { ctx, company } = await seedCompany();
    const assessment = await getOrCreateActiveAssessment(ctx, company.id);
    await saveAnswer(ctx, assessment.id, "gov-01", true);
    await expect(completeAssessment(ctx, assessment.id)).rejects.toThrow(
      MissingAnswersError,
    );
  });

  it("freezes engine scores on completion and blocks further writes", async () => {
    const { ctx, company } = await seedCompany();
    const assessment = await getOrCreateActiveAssessment(ctx, company.id);
    for (const [questionId, value] of Object.entries(bestAnswers())) {
      await saveAnswer(ctx, assessment.id, questionId, value);
    }
    const completed = await completeAssessment(ctx, assessment.id);
    expect(completed.status).toBe("completed");
    expect(Number(completed.globalScore)).toBe(100);
    expect(completed.categoryScores).toMatchObject({ governance: 100, finance: 100 });
    expect(completed.completedAt).toBeInstanceOf(Date);

    await expect(saveAnswer(ctx, assessment.id, "gov-01", false)).rejects.toThrow(
      InvalidStateError,
    );
    await expect(completeAssessment(ctx, assessment.id)).rejects.toThrow(
      InvalidStateError,
    );
  });

  it("starts a fresh assessment after the previous one is completed", async () => {
    const { ctx, company } = await seedCompany();
    const first = await getOrCreateActiveAssessment(ctx, company.id);
    for (const [questionId, value] of Object.entries(bestAnswers())) {
      await saveAnswer(ctx, first.id, questionId, value);
    }
    await completeAssessment(ctx, first.id);

    const next = await getOrCreateActiveAssessment(ctx, company.id);
    expect(next.id).not.toBe(first.id);
    expect(next.status).toBe("in_progress");

    const latest = await getLatestAssessment(ctx, company.id);
    expect(latest?.id).toBe(next.id);

    // Results must keep pointing at the completed run while the new one is open.
    const latestCompleted = await getLatestCompletedAssessment(ctx, company.id);
    expect(latestCompleted?.id).toBe(first.id);
    expect(latestCompleted?.status).toBe("completed");
  });

  it("never creates two open assessments for one company under concurrency", async () => {
    const { ctx, company } = await seedCompany();
    const [a, b] = await Promise.all([
      getOrCreateActiveAssessment(ctx, company.id),
      getOrCreateActiveAssessment(ctx, company.id),
    ]);
    expect(a.id).toBe(b.id);
  });

  it("lets exactly one of two concurrent completions win", async () => {
    const { ctx, company } = await seedCompany();
    const assessment = await getOrCreateActiveAssessment(ctx, company.id);
    for (const [questionId, value] of Object.entries(bestAnswers())) {
      await saveAnswer(ctx, assessment.id, questionId, value);
    }
    const results = await Promise.allSettled([
      completeAssessment(ctx, assessment.id),
      completeAssessment(ctx, assessment.id),
    ]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter(
      (r): r is PromiseRejectedResult => r.status === "rejected",
    );
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toBeInstanceOf(InvalidStateError);
  });
});
