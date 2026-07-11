import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../db";
import { assessment } from "../../db/schema";
import { getQuestionnaire, CURRENT_QUESTIONNAIRE_VERSION } from "../questionnaire";
import { migrateTestDb, seedOrgWithUser, truncateAll } from "../../test/db";
import { completeAssessment, getOrCreateActiveAssessment, saveAnswer } from "./assessments";
import { createCompany } from "./companies";
import { upsertFinancialYear } from "./financials";
import { generateRoadmapForAssessment, updateRoadmapItemStatus } from "./roadmap";
import { runValuation } from "./valuations";
import { getCockpitSnapshot } from "./cockpit";

const questionnaire = getQuestionnaire(CURRENT_QUESTIONNAIRE_VERSION);

function completeAnswers(): Record<string, boolean | number | string> {
  const values: Record<string, boolean | number | string> = {};
  for (const category of questionnaire.categories) {
    for (const question of category.questions) {
      if (question.type === "yes_no") values[question.id] = true;
      else if (question.type === "scale_0_4") values[question.id] = 4;
      else
        values[question.id] = [...question.choices!].sort(
          (a, b) => b.value - a.value,
        )[0].id;
    }
  }
  values["com-01"] = false;
  values["com-02"] = "never";
  // Keep three deterministic unresolved roadmap items for the top-three contract.
  values["fin-01"] = false;
  return values;
}

async function seedCompletedAssessment(
  values: Record<string, boolean | number | string> = completeAnswers(),
) {
  const ctx = await seedOrgWithUser("owner");
  const company = await createCompany(ctx, {
    name: "Tenant A SAS",
    sector: "Software",
    country: "FR",
  });
  const assessment = await getOrCreateActiveAssessment(ctx, company.id);
  for (const [questionId, value] of Object.entries(values)) {
    await saveAnswer(ctx, assessment.id, questionId, value);
  }
  const completed = await completeAssessment(ctx, assessment.id);
  return { ctx, company, assessment: completed };
}

async function seedCompletedCockpit(
  values: Record<string, boolean | number | string> = completeAnswers(),
) {
  const seeded = await seedCompletedAssessment(values);
  const { ctx, company, assessment } = seeded;
  for (const fiscalYear of [2023, 2024, 2025]) {
    await upsertFinancialYear(ctx, company.id, {
      fiscalYear,
      revenue: 5_000_000 + (fiscalYear - 2023) * 500_000,
      ebitda: 1_000_000,
      netIncome: 600_000,
      netDebt: 200_000,
      freeCashFlow: 700_000,
    });
  }
  await runValuation(ctx, company.id);
  const roadmapItems = await generateRoadmapForAssessment(ctx, assessment.id);
  return { ...seeded, roadmapItems };
}

describe("cockpit data-access", () => {
  beforeAll(migrateTestDb);
  beforeEach(truncateAll);

  it("returns empty states without creating company data", async () => {
    const ownerCtxWithoutCompany = await seedOrgWithUser("owner");
    expect(await getCockpitSnapshot(ownerCtxWithoutCompany)).toEqual({ kind: "no_company" });

    const ownerCtxWithCompany = await seedOrgWithUser("owner");
    await createCompany(ownerCtxWithCompany, {
      name: "Empty SAS",
      sector: "Software",
      country: "FR",
    });
    const empty = await getCockpitSnapshot(ownerCtxWithCompany);
    expect(empty.kind).toBe("company");
    if (empty.kind === "company") {
      expect(empty.assessment).toEqual({ kind: "missing" });
      expect(empty.valuation).toEqual({ kind: "missing_financials" });
      expect(empty.priorities).toEqual([]);
      expect(empty.trajectory.current.id).toBe("foundation");
    }
  });

  it("assembles stored completed results and unresolved priorities", async () => {
    const { ctx: ownerCtxWithCompletedData, company: ownerCompany } =
      await seedCompletedCockpit();

    const populated = await getCockpitSnapshot(ownerCtxWithCompletedData);
    expect(populated.kind).toBe("company");
    if (populated.kind === "company") {
      expect(populated.company.id).toBe(ownerCompany.id);
      expect(populated.assessment.kind).toBe("available");
      expect(populated.valuation.kind).toBe("available");
      expect(populated.priorities.every((item) => String(item.status) !== "done")).toBe(true);
      expect(populated.priorities).toHaveLength(3);
    }
  });

  it("marks an incomplete completed snapshot unavailable without inventing zero scores", async () => {
    const ctx = await seedOrgWithUser("owner");
    const company = await createCompany(ctx, {
      name: "Legacy SAS",
      sector: "Software",
      country: "FR",
    });
    await db.insert(assessment).values({
      organizationId: ctx.organizationId,
      companyId: company.id,
      questionnaireVersion: CURRENT_QUESTIONNAIRE_VERSION,
      status: "completed",
    });

    const snapshot = await getCockpitSnapshot(ctx);
    expect(snapshot.kind).toBe("company");
    if (snapshot.kind === "company") {
      expect(snapshot.assessment).toEqual({
        kind: "unavailable",
        reason: "incomplete_snapshot",
      });
      expect(snapshot.limitingCategory).toBeNull();
      expect(snapshot.trajectory.current.id).toBe("foundation");
    }
  });

  it("rejects a non-null completed snapshot with partial category scores", async () => {
    const ctx = await seedOrgWithUser("owner");
    const company = await createCompany(ctx, {
      name: "Partial Legacy SAS",
      sector: "Software",
      country: "FR",
    });
    await db.insert(assessment).values({
      organizationId: ctx.organizationId,
      companyId: company.id,
      questionnaireVersion: CURRENT_QUESTIONNAIRE_VERSION,
      status: "completed",
      globalScore: "50",
      categoryScores: { governance: 60 },
      completedAt: new Date("2026-07-11T12:00:00.000Z"),
    });

    const snapshot = await getCockpitSnapshot(ctx);
    expect(snapshot.kind).toBe("company");
    if (snapshot.kind === "company") {
      expect(snapshot.assessment).toEqual({
        kind: "unavailable",
        reason: "incomplete_snapshot",
      });
      expect(snapshot.limitingCategory).toBeNull();
      expect(snapshot.trajectory.current.id).toBe("foundation");
    }
  });

  it("rejects non-finite global scores and out-of-range category scores", async () => {
    const validCategoryScores = Object.fromEntries(
      questionnaire.categories.map((category) => [category.id, 50]),
    );
    const invalidSnapshots = [
      { globalScore: "NaN", categoryScores: validCategoryScores },
      {
        globalScore: "50",
        categoryScores: { ...validCategoryScores, governance: 101 },
      },
    ];

    for (const [index, invalid] of invalidSnapshots.entries()) {
      const ctx = await seedOrgWithUser("owner");
      const company = await createCompany(ctx, {
        name: `Invalid Scores ${index} SAS`,
        sector: "Software",
        country: "FR",
      });
      await db.insert(assessment).values({
        organizationId: ctx.organizationId,
        companyId: company.id,
        questionnaireVersion: CURRENT_QUESTIONNAIRE_VERSION,
        status: "completed",
        globalScore: invalid.globalScore,
        categoryScores: invalid.categoryScores,
        completedAt: new Date("2026-07-11T12:00:00.000Z"),
      });

      const snapshot = await getCockpitSnapshot(ctx);
      expect(snapshot.kind).toBe("company");
      if (snapshot.kind === "company") {
        expect(snapshot.assessment).toEqual({
          kind: "unavailable",
          reason: "incomplete_snapshot",
        });
        expect(snapshot.limitingCategory).toBeNull();
        expect(snapshot.trajectory.current.id).toBe("foundation");
      }
    }
  });

  it("reports answer progress for an in-progress assessment without a provisional score", async () => {
    const ctx = await seedOrgWithUser("owner");
    const company = await createCompany(ctx, {
      name: "Progress SAS",
      sector: "Software",
      country: "FR",
    });
    const active = await getOrCreateActiveAssessment(ctx, company.id);
    await saveAnswer(ctx, active.id, "gov-01", true);
    await saveAnswer(ctx, active.id, "gov-02", 3);

    const snapshot = await getCockpitSnapshot(ctx);
    expect(snapshot.kind).toBe("company");
    if (snapshot.kind === "company") {
      expect(snapshot.assessment).toEqual({
        kind: "in_progress",
        answered: 2,
        total: questionnaire.categories.flatMap((category) => category.questions).length,
      });
      expect(snapshot.assessment).not.toHaveProperty("score");
      expect(snapshot.trajectory.current.id).toBe("foundation");
    }
  });

  it("keeps the previous frozen snapshot available during a reassessment", async () => {
    const { ctx, company, assessment: completed } = await seedCompletedAssessment();
    const active = await getOrCreateActiveAssessment(ctx, company.id);
    await saveAnswer(ctx, active.id, "gov-01", false);

    const snapshot = await getCockpitSnapshot(ctx);
    expect(snapshot.kind).toBe("company");
    if (snapshot.kind === "company") {
      expect(snapshot.assessment.kind).toBe("available");
      if (snapshot.assessment.kind === "available") {
        expect(snapshot.assessment.score).toBe(Number(completed.globalScore));
        expect(snapshot.assessment.completedAt).toEqual(completed.completedAt);
      }
    }
  });

  it("falls back to ranked assessment actions when no roadmap exists", async () => {
    const { ctx } = await seedCompletedAssessment();

    const snapshot = await getCockpitSnapshot(ctx);
    expect(snapshot.kind).toBe("company");
    if (snapshot.kind === "company") {
      expect(snapshot.priorities).toHaveLength(3);
      expect(snapshot.priorities.every((item) => item.source === "assessment")).toBe(true);
      expect(snapshot.priorities).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            priority: "high",
            estimatedWeeks: null,
            status: "todo",
          }),
        ]),
      );
    }
  });

  it("does not use assessment fallback when an existing roadmap is all done", async () => {
    const { ctx, roadmapItems } = await seedCompletedCockpit();
    for (const item of roadmapItems) {
      await updateRoadmapItemStatus(ctx, item.id, "done");
    }

    const snapshot = await getCockpitSnapshot(ctx);
    expect(snapshot.kind).toBe("company");
    if (snapshot.kind === "company") {
      expect(snapshot.priorities).toEqual([]);
      expect(snapshot.attentionCount).toBe(0);
    }
  });

  it("preserves roadmap order, caps priorities, and counts all urgent unresolved items", async () => {
    const values = completeAnswers();
    values["gov-01"] = false;
    values["gov-07"] = false;
    const { ctx, roadmapItems } = await seedCompletedCockpit(values);
    expect(roadmapItems.length).toBeGreaterThan(3);

    const snapshot = await getCockpitSnapshot(ctx);
    expect(snapshot.kind).toBe("company");
    if (snapshot.kind === "company") {
      const unresolved = roadmapItems.filter((item) => item.status !== "done");
      expect(snapshot.priorities.map((item) => item.id)).toEqual(
        unresolved.slice(0, 3).map((item) => item.id),
      );
      expect(snapshot.attentionCount).toBe(
        unresolved.filter(
          (item) => item.priority === "critical" || item.priority === "high",
        ).length,
      );
    }
  });

  it("uses the questionnaire label for the lowest frozen category score", async () => {
    const { ctx } = await seedCompletedAssessment();

    const snapshot = await getCockpitSnapshot(ctx);
    expect(snapshot.kind).toBe("company");
    if (snapshot.kind === "company") {
      expect(snapshot.assessment.kind).toBe("available");
    }
    if (snapshot.kind === "company" && snapshot.assessment.kind === "available") {
      const lowestCategoryId = Object.entries(snapshot.assessment.categoryScores).reduce(
        (lowest, [categoryId, score]) =>
          lowest === null || score < lowest.score ? { categoryId, score } : lowest,
        null as { categoryId: string; score: number } | null,
      )!.categoryId;
      const expectedLabel = questionnaire.categories.find(
        (category) => category.id === lowestCategoryId,
      )!.label;
      expect(snapshot.limitingCategory).toBe(expectedLabel);
    }
  });

  it("never exposes another organization's cockpit data", async () => {
    const tenantA = await seedCompletedCockpit();
    const secondTenantCtx = await seedOrgWithUser("owner");

    const otherTenant = await getCockpitSnapshot(secondTenantCtx);
    expect(otherTenant).toEqual({ kind: "no_company" });
    const serialized = JSON.stringify(otherTenant);
    expect(serialized).not.toContain(tenantA.company.id);
    expect(serialized).not.toContain(tenantA.company.name);
    expect(serialized).not.toContain("assessment");
    expect(serialized).not.toContain("valuation");
    expect(serialized).not.toContain("priorities");
  });
});
