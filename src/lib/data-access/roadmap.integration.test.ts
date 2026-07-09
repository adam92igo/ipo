import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  CURRENT_QUESTIONNAIRE_VERSION,
  getQuestionnaire,
} from "../questionnaire";
import { migrateTestDb, seedOrgWithUser, truncateAll } from "../../test/db";
import {
  completeAssessment,
  getOrCreateActiveAssessment,
  saveAnswer,
} from "./assessments";
import { createCompany } from "./companies";
import { InvalidStateError, NotFoundError } from "./errors";
import {
  generateRoadmapForAssessment,
  listRoadmapItems,
  updateRoadmapItemStatus,
} from "./roadmap";

const questionnaire = getQuestionnaire(CURRENT_QUESTIONNAIRE_VERSION);

/** All-best answers except the audit questions, which fire critical rules. */
function answersWithAuditGap(): Record<string, boolean | number | string> {
  const answers: Record<string, boolean | number | string> = {};
  for (const category of questionnaire.categories) {
    for (const q of category.questions) {
      if (q.type === "yes_no") answers[q.id] = true;
      else if (q.type === "scale_0_4") answers[q.id] = 4;
      else answers[q.id] = [...q.choices!].sort((a, b) => b.value - a.value)[0].id;
    }
  }
  answers["com-01"] = false; // no statutory auditor -> r-cac (critical)
  answers["com-02"] = "never"; // accounts never audited -> r-audits (critical)
  return answers;
}

async function seedCompletedAssessment() {
  const ctx = await seedOrgWithUser("owner");
  const company = await createCompany(ctx, {
    name: "Acme SAS",
    sector: "Software",
    country: "FR",
  });
  const assessment = await getOrCreateActiveAssessment(ctx, company.id);
  for (const [questionId, value] of Object.entries(answersWithAuditGap())) {
    await saveAnswer(ctx, assessment.id, questionId, value);
  }
  await completeAssessment(ctx, assessment.id);
  return { ctx, company, assessment };
}

describe("roadmap data-access", () => {
  beforeAll(async () => {
    await migrateTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  it("generates ordered items from a completed assessment, stamped with the rules version", async () => {
    const { ctx, assessment } = await seedCompletedAssessment();
    const items = await generateRoadmapForAssessment(ctx, assessment.id);

    expect(items.length).toBeGreaterThanOrEqual(2);
    expect(items.map((i) => i.ruleId)).toContain("r-audits");
    expect(items.map((i) => i.ruleId)).toContain("r-cac");
    expect(items[0].priority).toBe("critical");
    expect(items[0].rulesVersion).toBe("v1");
    expect(items[0].organizationId).toBe(ctx.organizationId);
    expect(items.map((i) => i.sortOrder)).toEqual(items.map((_, idx) => idx));
  });

  it("refuses to generate for an in-progress assessment", async () => {
    const ctx = await seedOrgWithUser("owner");
    const company = await createCompany(ctx, {
      name: "Acme SAS",
      sector: "Software",
      country: "FR",
    });
    const assessment = await getOrCreateActiveAssessment(ctx, company.id);
    await expect(generateRoadmapForAssessment(ctx, assessment.id)).rejects.toThrow(
      InvalidStateError,
    );
  });

  it("preserves item statuses by rule on regeneration", async () => {
    const { ctx, assessment } = await seedCompletedAssessment();
    const first = await generateRoadmapForAssessment(ctx, assessment.id);
    const audits = first.find((i) => i.ruleId === "r-audits")!;
    await updateRoadmapItemStatus(ctx, audits.id, "in_progress");

    const regenerated = await generateRoadmapForAssessment(ctx, assessment.id);
    const auditsAgain = regenerated.find((i) => i.ruleId === "r-audits")!;
    expect(auditsAgain.status).toBe("in_progress");
    // Regeneration replaces rows — old ids are gone, statuses carried over.
    expect(regenerated.map((i) => i.ruleId).sort()).toEqual(
      first.map((i) => i.ruleId).sort(),
    );
  });

  it("scopes reads, writes and status updates to the organization", async () => {
    const { ctx, assessment } = await seedCompletedAssessment();
    const items = await generateRoadmapForAssessment(ctx, assessment.id);
    const other = await seedOrgWithUser("owner");

    await expect(generateRoadmapForAssessment(other, assessment.id)).rejects.toThrow(
      NotFoundError,
    );
    await expect(listRoadmapItems(other, assessment.id)).rejects.toThrow(
      NotFoundError,
    );
    await expect(
      updateRoadmapItemStatus(other, items[0].id, "done"),
    ).rejects.toThrow(NotFoundError);
  });

  it("lets members update statuses (progress tracking is not owner-gated)", async () => {
    const { ctx, assessment } = await seedCompletedAssessment();
    const items = await generateRoadmapForAssessment(ctx, assessment.id);
    const memberCtx = { ...ctx, role: "member" as const };

    const updated = await updateRoadmapItemStatus(memberCtx, items[0].id, "done");
    expect(updated.status).toBe("done");
  });
});
