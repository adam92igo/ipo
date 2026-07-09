import { and, asc, eq } from "drizzle-orm";
import { generateRoadmap } from "@/engines/roadmap";
import { db } from "../../db";
import { assessment, roadmapItem } from "../../db/schema";
import { getQuestionnaire } from "../questionnaire";
import {
  CURRENT_ROADMAP_RULES_VERSION,
  getRoadmapRules,
} from "../roadmap-rules";
import { getAnswersFor, type Assessment } from "./assessments";
import { InvalidStateError, NotFoundError } from "./errors";
import type { OrgContext } from "./org-context";

export type RoadmapItem = typeof roadmapItem.$inferSelect;
export type RoadmapItemStatus = RoadmapItem["status"];

async function getScopedCompletedAssessment(
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
  if (rows[0].status !== "completed")
    throw new InvalidStateError("Complete the assessment before generating a roadmap");
  return rows[0];
}

export async function listRoadmapItems(
  ctx: OrgContext,
  assessmentId: string,
): Promise<RoadmapItem[]> {
  await getScopedCompletedAssessment(ctx, assessmentId);
  return db
    .select()
    .from(roadmapItem)
    .where(
      and(
        eq(roadmapItem.assessmentId, assessmentId),
        eq(roadmapItem.organizationId, ctx.organizationId),
      ),
    )
    .orderBy(asc(roadmapItem.sortOrder));
}

/**
 * Deterministic regeneration: replaces the assessment's items with the plan
 * the rules engine derives from its answers, carrying item statuses over by
 * ruleId so ticking off steps survives a re-run. All roles may generate
 * (derived computation, like valuation runs — sources stay owner/admin).
 */
export async function generateRoadmapForAssessment(
  ctx: OrgContext,
  assessmentId: string,
): Promise<RoadmapItem[]> {
  const scoped = await getScopedCompletedAssessment(ctx, assessmentId);
  const questionnaire = getQuestionnaire(scoped.questionnaireVersion);
  const rules = getRoadmapRules(CURRENT_ROADMAP_RULES_VERSION);
  const answers = await getAnswersFor(ctx, scoped);

  const specs = generateRoadmap({ rules, questionnaire, answers });

  return db.transaction(async (tx) => {
    const existing = await tx
      .select({ ruleId: roadmapItem.ruleId, status: roadmapItem.status })
      .from(roadmapItem)
      .where(
        and(
          eq(roadmapItem.assessmentId, assessmentId),
          eq(roadmapItem.organizationId, ctx.organizationId),
        ),
      );
    const previousStatus = new Map(existing.map((i) => [i.ruleId, i.status]));

    await tx
      .delete(roadmapItem)
      .where(
        and(
          eq(roadmapItem.assessmentId, assessmentId),
          eq(roadmapItem.organizationId, ctx.organizationId),
        ),
      );

    if (specs.length === 0) return [];

    return tx
      .insert(roadmapItem)
      .values(
        specs.map((spec) => ({
          organizationId: ctx.organizationId,
          assessmentId,
          ruleId: spec.ruleId,
          rulesVersion: rules.version,
          title: spec.title,
          description: spec.description,
          category: spec.categoryId,
          priority: spec.priority,
          estimatedWeeks: spec.estimatedWeeks,
          sortOrder: spec.sortOrder,
          status: previousStatus.get(spec.ruleId) ?? ("todo" as const),
        })),
      )
      .returning();
  });
}

export async function updateRoadmapItemStatus(
  ctx: OrgContext,
  itemId: string,
  status: RoadmapItemStatus,
): Promise<RoadmapItem> {
  const [updated] = await db
    .update(roadmapItem)
    .set({ status, updatedAt: new Date() })
    .where(
      and(eq(roadmapItem.id, itemId), eq(roadmapItem.organizationId, ctx.organizationId)),
    )
    .returning();
  if (!updated) throw new NotFoundError("Roadmap item");
  return updated;
}
