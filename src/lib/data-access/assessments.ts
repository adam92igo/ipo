import { and, desc, eq } from "drizzle-orm";
import {
  computeScores,
  normalizeAnswer,
  type AnswerValue,
} from "@/engines/scoring";
import { db, type Database } from "../../db";
import { answer, assessment } from "../../db/schema";
import {
  CURRENT_QUESTIONNAIRE_VERSION,
  getQuestionIndex,
  getQuestionnaire,
} from "../questionnaire";
import { getCompany, type Company } from "./companies";
import { InvalidStateError, NotFoundError } from "./errors";
import type { OrgContext } from "./org-context";

export type Assessment = typeof assessment.$inferSelect;

/**
 * All roles may fill diagnostics (members included) — writes are gated by
 * membership, which OrgContext already proves.
 *
 * Concurrency model: the partial unique index assessment_active_company_uq
 * guarantees at most one in_progress assessment per company; saveAnswer and
 * completeAssessment serialize on a row lock (SELECT ... FOR UPDATE) so an
 * autosave can never land after the score snapshot of a completion.
 */

type Tx = Database | Parameters<Parameters<Database["transaction"]>[0]>[0];

async function getScopedAssessment(
  ctx: OrgContext,
  assessmentId: string,
  executor: Tx = db,
  opts: { forUpdate?: boolean } = {},
): Promise<Assessment> {
  const base = executor
    .select()
    .from(assessment)
    .where(
      and(eq(assessment.id, assessmentId), eq(assessment.organizationId, ctx.organizationId)),
    )
    .limit(1);
  const rows = await (opts.forUpdate ? base.for("update") : base);
  if (!rows[0]) throw new NotFoundError("Assessment");
  return rows[0];
}

async function fetchAnswerRows(
  organizationId: string,
  assessmentId: string,
  executor: Tx = db,
): Promise<Record<string, AnswerValue>> {
  const rows = await executor
    .select({ questionId: answer.questionId, value: answer.value })
    .from(answer)
    .where(
      and(eq(answer.assessmentId, assessmentId), eq(answer.organizationId, organizationId)),
    );
  return Object.fromEntries(rows.map((r) => [r.questionId, r.value as AnswerValue]));
}

/** Read-only: the company's open assessment for the current version, if any. */
export async function getActiveAssessment(
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
        eq(assessment.status, "in_progress"),
        eq(assessment.questionnaireVersion, CURRENT_QUESTIONNAIRE_VERSION),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Explicit mutation (called from a server action, never from a GET render):
 * returns the open assessment or creates one. Safe under concurrency — the
 * partial unique index makes the insert race lose gracefully.
 */
export async function getOrCreateActiveAssessment(
  ctx: OrgContext,
  companyId: string,
  verifiedCompany?: Company,
): Promise<Assessment> {
  // Also proves the company belongs to the caller's organization.
  if (!verifiedCompany || verifiedCompany.id !== companyId) {
    await getCompany(ctx, companyId);
  }

  const existing = await getActiveAssessment(ctx, companyId);
  if (existing) return existing;

  const inserted = await db
    .insert(assessment)
    .values({
      organizationId: ctx.organizationId,
      companyId,
      questionnaireVersion: CURRENT_QUESTIONNAIRE_VERSION,
    })
    .onConflictDoNothing()
    .returning();
  if (inserted[0]) return inserted[0];

  // Lost the race: another request created the row — return it.
  const winner = await getActiveAssessment(ctx, companyId);
  if (!winner) throw new NotFoundError("Assessment");
  return winner;
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
  return fetchAnswerRows(ctx.organizationId, assessmentId);
}

/** Like getAnswers, but skips the scope re-check for a row the caller already verified. */
export async function getAnswersFor(
  ctx: OrgContext,
  verified: Assessment,
): Promise<Record<string, AnswerValue>> {
  return fetchAnswerRows(ctx.organizationId, verified.id);
}

/**
 * Progress save: one upsert per answered question. Validates the value with
 * the deterministic engine, then writes under a row lock so it can never land
 * on an assessment that completes concurrently.
 */
export async function saveAnswer(
  ctx: OrgContext,
  assessmentId: string,
  questionId: string,
  value: AnswerValue,
): Promise<void> {
  // Validate outside the transaction — no lock held during config work.
  const scoped = await getScopedAssessment(ctx, assessmentId);
  const question = getQuestionIndex(scoped.questionnaireVersion).get(questionId);
  if (!question) throw new NotFoundError("Question");
  normalizeAnswer(question, value); // throws InvalidAnswerError on bad input

  await db.transaction(async (tx) => {
    const locked = await getScopedAssessment(ctx, assessmentId, tx, { forUpdate: true });
    if (locked.status !== "in_progress")
      throw new InvalidStateError("Assessment is already completed");
    await tx
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
  });
}

/** Computes scores with the engine, freezes them on the row and closes the assessment. */
export async function completeAssessment(
  ctx: OrgContext,
  assessmentId: string,
): Promise<Assessment> {
  return db.transaction(async (tx) => {
    const locked = await getScopedAssessment(ctx, assessmentId, tx, { forUpdate: true });
    if (locked.status !== "in_progress")
      throw new InvalidStateError("Assessment is already completed");

    const questionnaire = getQuestionnaire(locked.questionnaireVersion);
    const answers = await fetchAnswerRows(ctx.organizationId, assessmentId, tx);
    const scores = computeScores(questionnaire, answers); // throws MissingAnswersError

    const [updated] = await tx
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
        and(
          eq(assessment.id, assessmentId),
          eq(assessment.organizationId, ctx.organizationId),
          // Belt and braces on top of the row lock: never re-freeze scores.
          eq(assessment.status, "in_progress"),
        ),
      )
      .returning();
    if (!updated) throw new InvalidStateError("Assessment is already completed");
    return updated;
  });
}
