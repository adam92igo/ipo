import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getQuestionnaire, CURRENT_QUESTIONNAIRE_VERSION } from "../questionnaire";
import { migrateTestDb, seedOrgWithUser, truncateAll } from "../../test/db";
import { completeAssessment, getOrCreateActiveAssessment, saveAnswer } from "./assessments";
import { createCompany } from "./companies";
import { upsertFinancialYear } from "./financials";
import { generateRoadmapForAssessment } from "./roadmap";
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

async function seedCompletedCockpit() {
  const ctx = await seedOrgWithUser("owner");
  const company = await createCompany(ctx, {
    name: "Tenant A SAS",
    sector: "Software",
    country: "FR",
  });
  const assessment = await getOrCreateActiveAssessment(ctx, company.id);
  for (const [questionId, value] of Object.entries(completeAnswers())) {
    await saveAnswer(ctx, assessment.id, questionId, value);
  }
  await completeAssessment(ctx, assessment.id);
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
  await generateRoadmapForAssessment(ctx, assessment.id);
  return { ctx, company };
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
