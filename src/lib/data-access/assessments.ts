import { and, desc, eq } from "drizzle-orm";
import {
  computeScores,
  normalizeAnswer,
  type AnswerValue,
} from "@/engines/scoring";
import { db } from "../../db";
import { answer, assessment } from "../../db/schema";
import {
  CURRENT_QUESTIONNAIRE_VERSION,
  getQuestionnaire,
} from "../questionnaire";
import { getCompany } from "./companies";
import { InvalidStateError, NotFoundError } from "./errors";
import type { OrgContext } from "./org-context";

export type Assessment = typeof assessment.$inferSelect;

/**
 * All roles may fill diagnostics (members included) — writes are gated by
 * membership, which OrgContext already proves.
 */

async function getScopedAssessment(
  ctx: OrgContext,
  assessmentId: string,
): Promise<Assessment> {
  const rows = await db
    .select()
    .from(assessment)
    .where(
      and(eq(assessment.id, assessmentId), eq(assessment.organizationId, ctx.organizationId)),
    )
    .limit(1);
  if (!rows[0]) throw new NotFoundError("Assessment");
  return rows[0];
}

/** Returns the company's in_progress assessment for the current questionnaire version, creating one if needed. */
export async function getOrCreateActiveAssessment(
  ctx: OrgContext,
  companyId: string,
): Promise<Assessment> {
  // Also proves the company belongs to the caller's organization.
  await getCompany(ctx, companyId);

  const existing = await db
    .select()
    .from(assessment)
    .where(
      and(
        eq(assessment.companyId, companyId),
        eq(assessment.organizationId, ctx.organizationId),
        eq(assessment.status, "in_progress"),
        eq(assessment.questionnaireVersion, CURRENT_QUESTIONNAIRE_VERSION),
      ),
    )
    .orderBy(desc(assessment.startedAt))
    .limit(1);
  if (existing[0]) return existing[0];

  const [created] = await db
    .insert(assessment)
    .values({
      organizationId: ctx.organizationId,
      companyId,
      questionnaireVersion: CURRENT_QUESTIONNAIRE_VERSION,
    })
    .returning();
  return created;
}

export async function getLatestAssessment(
  ctx: OrgContext,
  companyId: string,
): Promise<Assessment | null> {
  const rows = await db
    .select()
    .from(assessment)
    .where(
      and(
        eq(assessment.companyId, companyId),
        eq(assessment.organizationId, ctx.organizationId),
      ),
    )
    .orderBy(desc(assessment.startedAt))
    .limit(1);
  return rows[0] ?? null;
}

/** Latest COMPLETED assessment — results stay visible while a reassessment is in progress. */
export async function getLatestCompletedAssessment(
  ctx: OrgContext,
  companyId: string,
): Promise<Assessment | null> {
  const rows = await db
    .select()
    .from(assessment)
    .where(
      and(
        eq(assessment.companyId, companyId),
        eq(assessment.organizationId, ctx.organizationId),
        eq(assessment.status, "completed"),
      ),
    )
    .orderBy(desc(assessment.completedAt))
    .limit(1);
  return rows[0] ?? null;
}

/** Latest completed assessment per company (one query), for list views. */
export async function listLatestCompletedAssessmentsByCompany(
  ctx: OrgContext,
): Promise<Map<string, Assessment>> {
  const rows = await db
    .selectDistinctOn([assessment.companyId])
    .from(assessment)
    .where(
      and(
        eq(assessment.organizationId, ctx.organizationId),
        eq(assessment.status, "completed"),
      ),
    )
    .orderBy(assessment.companyId, desc(assessment.completedAt));
  return new Map(rows.map((r) => [r.companyId, r]));
}

/** Latest assessment per company of the org (one query), for list views. */
export async function listLatestAssessmentsByCompany(
  ctx: OrgContext,
): Promise<Map<string, Assessment>> {
  const rows = await db
    .selectDistinctOn([assessment.companyId])
    .from(assessment)
    .where(eq(assessment.organizationId, ctx.organizationId))
    .orderBy(assessment.companyId, desc(assessment.startedAt));
  return new Map(rows.map((r) => [r.companyId, r]));
}

export async function getAnswers(
  ctx: OrgContext,
  assessmentId: string,
): Promise<Record<string, AnswerValue>> {
  await getScopedAssessment(ctx, assessmentId);
  const rows = await db
    .select({ questionId: answer.questionId, value: answer.value })
    .from(answer)
    .where(
      and(eq(answer.assessmentId, assessmentId), eq(answer.organizationId, ctx.organizationId)),
    );
  return Object.fromEntries(rows.map((r) => [r.questionId, r.value as AnswerValue]));
}

/**
 * Progress save: one upsert per answered question. Validates the value with
 * the deterministic engine before touching the database.
 */
export async function saveAnswer(
  ctx: OrgContext,
  assessmentId: string,
  questionId: string,
  value: AnswerValue,
): Promise<void> {
  const scoped = await getScopedAssessment(ctx, assessmentId);
  if (scoped.status !== "in_progress")
    throw new InvalidStateError("Assessment is already completed");

  const questionnaire = getQuestionnaire(scoped.questionnaireVersion);
  const question = questionnaire.categories
    .flatMap((c) => c.questions)
    .find((q) => q.id === questionId);
  if (!question) throw new NotFoundError("Question");

  normalizeAnswer(question, value); // throws InvalidAnswerError on bad input

  await db
    .insert(answer)
    .values({
      organizationId: ctx.organizationId,
      assessmentId,
      questionId,
      value,
    })
    .onConflictDoUpdate({
      target: [answer.assessmentId, answer.questionId],
      set: { value, updatedAt: new Date() },
    });
}

/** Computes scores with the engine, freezes them on the row and closes the assessment. */
export async function completeAssessment(
  ctx: OrgContext,
  assessmentId: string,
): Promise<Assessment> {
  const scoped = await getScopedAssessment(ctx, assessmentId);
  if (scoped.status !== "in_progress")
    throw new InvalidStateError("Assessment is already completed");

  const questionnaire = getQuestionnaire(scoped.questionnaireVersion);
  const answers = await getAnswers(ctx, assessmentId);
  const scores = computeScores(questionnaire, answers); // throws MissingAnswersError

  const [updated] = await db
    .update(assessment)
    .set({
      status: "completed",
      completedAt: new Date(),
      globalScore: String(scores.global),
      categoryScores: Object.fromEntries(
        scores.categories.map((c) => [c.id, c.score]),
      ),
    })
    .where(
      and(eq(assessment.id, assessmentId), eq(assessment.organizationId, ctx.organizationId)),
    )
    .returning();
  return updated;
}
