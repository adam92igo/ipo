import { classifyCategories } from "@/engines/scoring";
import type { AssistantCompanyContext } from "@/lib/ai/assistant";
import { getQuestionnaire } from "../questionnaire";
import { getLatestCompletedAssessment } from "./assessments";
import { getCompany } from "./companies";
import { listRoadmapItemsFor } from "./roadmap";
import { getLatestValuationRunFor, type ValuationRunResults } from "./valuations";
import type { OrgContext } from "./org-context";

/**
 * Read-only, org-scoped snapshot of a company's readiness data for the AI
 * assistant's system prompt. The AI never queries the database itself — it
 * only sees what this function hands it.
 */
export async function getAssistantCompanyContext(
  ctx: OrgContext,
  companyId: string,
): Promise<AssistantCompanyContext> {
  const company = await getCompany(ctx, companyId);
  const [assessment, valuationRun] = await Promise.all([
    getLatestCompletedAssessment(ctx, companyId),
    getLatestValuationRunFor(ctx, company),
  ]);

  const context: AssistantCompanyContext = {
    name: company.name,
    sector: company.sector,
  };

  if (assessment) {
    context.globalScore = Math.round(Number(assessment.globalScore));
    context.categoryScores = assessment.categoryScores ?? undefined;

    const questionnaire = getQuestionnaire(assessment.questionnaireVersion);
    const frozen = questionnaire.categories.map((c) => ({
      id: c.id,
      label: c.label,
      score: assessment.categoryScores?.[c.id] ?? 0,
    }));
    context.weaknesses = classifyCategories(frozen, questionnaire.thresholds)
      .weaknesses.map((w) => w.label);

    const items = await listRoadmapItemsFor(ctx, assessment);
    context.topActions = items
      .filter((i) => i.status !== "done")
      .slice(0, 5)
      .map((i) => i.title);
  }

  if (valuationRun) {
    const results = valuationRun.results as ValuationRunResults;
    context.valuationRange = {
      low: results.aggregated.low,
      high: results.aggregated.high,
    };
  }

  return context;
}
