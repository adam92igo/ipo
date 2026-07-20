import { eq } from "drizzle-orm";
import { Client } from "pg";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "../src/db";
import { company, member, user } from "../src/db/schema";
import { createCompany } from "../src/lib/data-access/companies";
import {
  completeAssessment,
  getOrCreateActiveAssessment,
  saveAnswer,
} from "../src/lib/data-access/assessments";
import { upsertFinancialYear } from "../src/lib/data-access/financials";
import {
  generateRoadmapForAssessment,
  updateRoadmapItemStatus,
} from "../src/lib/data-access/roadmap";
import { runValuation, type ValuationRunResults } from "../src/lib/data-access/valuations";
import { upsertShareStructure } from "../src/lib/data-access/share-structure";
import { isOrgRole, type OrgContext } from "../src/lib/data-access/org-context";
import { CURRENT_QUESTIONNAIRE_VERSION, getQuestionnaire } from "../src/lib/questionnaire";
import type { Answers, AnswerValue, Question, Questionnaire } from "../src/engines/scoring/types";
import type { FinancialYearInput } from "../src/lib/validation/financials";

type Tier = "good" | "medium" | "weak";

function pickAnswer(question: Question, tier: Tier): AnswerValue {
  if (question.type === "yes_no") return tier !== "weak"; // no partial credit on a yes/no
  if (question.type === "scale_0_4") return tier === "good" ? 4 : tier === "medium" ? 2 : 1;
  const sorted = [...question.choices!].sort((a, b) => b.value - a.value);
  if (tier === "good") return sorted[0].id;
  // Pick whichever choice sits closest to the tier's target normalized value,
  // rather than an index-based "middle" — robust to any number of choices.
  const target = tier === "weak" ? 0.25 : 0.5;
  return sorted.reduce((best, c) =>
    Math.abs(c.value - target) < Math.abs(best.value - target) ? c : best,
  ).id;
}

/** Builds answers for the given categories only, letting others stay unanswered. */
function buildAnswers(
  questionnaire: Questionnaire,
  categoryTiers: Partial<Record<string, Tier>>,
  overrides: Partial<Record<string, Tier>> = {},
): Answers {
  const answers: Answers = {};
  for (const category of questionnaire.categories) {
    const tier = categoryTiers[category.id];
    if (!tier) continue;
    for (const question of category.questions) {
      answers[question.id] = pickAnswer(question, overrides[question.id] ?? tier);
    }
  }
  return answers;
}

async function saveAllAnswers(
  ctx: OrgContext,
  assessmentId: string,
  answers: Answers,
): Promise<void> {
  for (const [questionId, value] of Object.entries(answers)) {
    await saveAnswer(ctx, assessmentId, questionId, value);
  }
}

async function ensureDemoDatabaseExists(demoUrl: string): Promise<void> {
  const target = new URL(demoUrl);
  const dbName = target.pathname.slice(1);
  const adminUrl = new URL(demoUrl);
  adminUrl.pathname = "/postgres"; // maintenance DB, always present on a fresh Postgres instance

  const admin = new Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  try {
    const { rowCount } = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [
      dbName,
    ]);
    if (rowCount === 0) {
      console.log(`Creating database "${dbName}"...`);
      await admin.query(`CREATE DATABASE "${dbName}"`);
    }
  } finally {
    await admin.end();
  }
}

async function seedReadyCompany(ctx: OrgContext, questionnaire: Questionnaire): Promise<void> {
  console.log("Seeding Solstice Technologies SAS (ready)...");
  const created = await createCompany(ctx, {
    name: "Solstice Technologies SAS",
    sector: "Software",
    country: "FR",
    headcount: 140,
    website: "https://solstice-tech.example.com",
  });

  const answers = buildAnswers(
    questionnaire,
    { governance: "good", finance: "good", growth: "good", compliance: "good", reporting: "good" },
    {
      "gov-02": "medium",
      "fin-03": "medium",
      // Two deliberately minor, low-priority gaps (BI dashboards, market
      // study) so the roadmap isn't empty — a "nearly there" company still
      // has a couple of loose ends, which reads better than a blank page.
      "rep-04": "weak",
      "gro-04": "weak",
    },
  );
  const assessment = await getOrCreateActiveAssessment(ctx, created.id);
  await saveAllAnswers(ctx, assessment.id, answers);
  const completed = await completeAssessment(ctx, assessment.id);

  const items = await generateRoadmapForAssessment(ctx, completed.id);
  for (const item of items) {
    await updateRoadmapItemStatus(ctx, item.id, "done");
  }

  const years: FinancialYearInput[] = [
    { fiscalYear: 2023, revenue: 8_000_000, ebitda: 1_200_000, netIncome: 700_000, netDebt: 500_000, freeCashFlow: 900_000 },
    { fiscalYear: 2024, revenue: 11_500_000, ebitda: 2_100_000, netIncome: 1_300_000, netDebt: 200_000, freeCashFlow: 1_600_000 },
    { fiscalYear: 2025, revenue: 15_800_000, ebitda: 3_400_000, netIncome: 2_200_000, netDebt: -300_000, freeCashFlow: 2_700_000 },
  ];
  for (const year of years) await upsertFinancialYear(ctx, created.id, year);
  const run = await runValuation(ctx, created.id);
  const results = run.results as ValuationRunResults;

  // Cap table: 5,000,000 existing shares, 1,250,000 new at the IPO (~20% dilution).
  await upsertShareStructure(ctx, created.id, {
    existingShares: 5_000_000,
    newShares: 1_250_000,
  });

  console.log(
    `  score ${completed.globalScore}, ${items.length} roadmap items, valuation midpoint ${results.aggregated.mid.toLocaleString("en-US")} EUR`,
  );
}

async function seedMidJourneyCompany(ctx: OrgContext, questionnaire: Questionnaire): Promise<void> {
  console.log("Seeding Ardennes Composites SAS (mid-journey)...");
  const created = await createCompany(ctx, {
    name: "Ardennes Composites SAS",
    sector: "Industrials",
    country: "FR",
    headcount: 310,
    website: "https://ardennes-composites.example.com",
  });

  const answers = buildAnswers(questionnaire, {
    governance: "weak",
    finance: "medium",
    growth: "medium",
    compliance: "weak",
    reporting: "medium",
  });
  const assessment = await getOrCreateActiveAssessment(ctx, created.id);
  await saveAllAnswers(ctx, assessment.id, answers);
  const completed = await completeAssessment(ctx, assessment.id);

  const items = await generateRoadmapForAssessment(ctx, completed.id);
  for (const item of items.slice(0, Math.ceil(items.length / 3))) {
    await updateRoadmapItemStatus(ctx, item.id, "in_progress");
  }

  // Only 2 fiscal years on record — the audit track record itself is one of
  // this company's flagged weaknesses (see com-02 in the "weak" tier above).
  const years: FinancialYearInput[] = [
    { fiscalYear: 2023, revenue: 22_000_000, ebitda: 2_400_000, netIncome: 900_000, netDebt: 6_000_000, freeCashFlow: 1_100_000 },
    { fiscalYear: 2024, revenue: 24_500_000, ebitda: 2_900_000, netIncome: 1_100_000, netDebt: 5_400_000, freeCashFlow: 1_400_000 },
  ];
  for (const year of years) await upsertFinancialYear(ctx, created.id, year);
  const run = await runValuation(ctx, created.id);
  const results = run.results as ValuationRunResults;

  // Cap table: 8,000,000 existing shares, no IPO issuance decided yet (0 new).
  await upsertShareStructure(ctx, created.id, {
    existingShares: 8_000_000,
    newShares: 0,
  });

  console.log(
    `  score ${completed.globalScore}, ${items.length} roadmap items, valuation midpoint ${results.aggregated.mid.toLocaleString("en-US")} EUR`,
  );
}

async function seedEarlyStageCompany(ctx: OrgContext, questionnaire: Questionnaire): Promise<void> {
  console.log("Seeding Bellevue Retail SAS (just starting)...");
  const created = await createCompany(ctx, {
    name: "Bellevue Retail SAS",
    sector: "Consumer Retail",
    country: "FR",
    headcount: 45,
  });

  // Only the governance category answered — assessment stays in_progress,
  // no financials/valuation/roadmap yet. This is the "day 1" experience.
  const answers = buildAnswers(questionnaire, { governance: "medium" });
  const assessment = await getOrCreateActiveAssessment(ctx, created.id);
  await saveAllAnswers(ctx, assessment.id, answers);

  console.log(`  assessment in progress (${Object.keys(answers).length} answers saved)`);
}

/**
 * Each demo login owns exactly one organization and one company — that's
 * the real product's tenancy model, so the demo must show it faithfully
 * rather than stacking several companies under one account.
 */
async function resolveDemoOrgContext(email: string): Promise<OrgContext> {
  const [demoUser] = await db.select().from(user).where(eq(user.email, email)).limit(1);
  if (!demoUser) {
    throw new Error(
      `No user found with email "${email}" in the demo database. Run \`pnpm demo\`, ` +
        `sign up at http://localhost:3200/sign-up with that email, and create your ` +
        `organization on the onboarding screen — then re-run this script.`,
    );
  }

  const [membership] = await db
    .select()
    .from(member)
    .where(eq(member.userId, demoUser.id))
    .limit(1);
  if (!membership || !isOrgRole(membership.role)) {
    throw new Error(
      `"${email}" has no organization yet in the demo database. Create one on the ` +
        `onboarding screen at http://localhost:3200/onboarding, then re-run this script.`,
    );
  }

  return {
    userId: demoUser.id,
    organizationId: membership.organizationId,
    role: membership.role,
  };
}

async function main(): Promise<void> {
  const demoUrl = process.env.DEMO_DATABASE_URL!;
  const stages: Array<{
    envVar: string;
    seed: (ctx: OrgContext, questionnaire: Questionnaire) => Promise<void>;
  }> = [
    { envVar: "DEMO_ACCOUNT_EMAIL_READY", seed: seedReadyCompany },
    { envVar: "DEMO_ACCOUNT_EMAIL_MID", seed: seedMidJourneyCompany },
    { envVar: "DEMO_ACCOUNT_EMAIL_EARLY", seed: seedEarlyStageCompany },
  ];

  await ensureDemoDatabaseExists(demoUrl);
  await migrate(db, { migrationsFolder: "./drizzle" });

  const questionnaire = getQuestionnaire(CURRENT_QUESTIONNAIRE_VERSION);
  for (const stage of stages) {
    const email = process.env[stage.envVar];
    if (!email) throw new Error(`${stage.envVar} is not set (see .env.example)`);

    const ctx = await resolveDemoOrgContext(email);
    console.log(`Resetting demo company for organization ${ctx.organizationId} (${email})...`);
    await db.delete(company).where(eq(company.organizationId, ctx.organizationId));
    await stage.seed(ctx, questionnaire);
  }

  console.log("Demo data ready.");
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
