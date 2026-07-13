import {
  classifyCategories,
  getProgress,
  rankPriorityActions,
  type CategoryScore,
} from "@/engines/scoring";
import {
  deriveMarketTrajectory,
  valuationState,
  type AssessmentSnapshotState,
  type ValuationSnapshotState,
} from "../cockpit";
import { readStoredReadinessScores } from "../assessment-snapshot";
import { getQuestionnaire } from "../questionnaire";
import {
  getAnswersFor,
  getLatestAssessment,
  getLatestCompletedAssessment,
} from "./assessments";
import { listCompanies, type Company } from "./companies";
import { listFinancialsFor } from "./financials";
import type { OrgContext } from "./org-context";
import { listRoadmapItemsFor, type RoadmapItem } from "./roadmap";
import {
  getLatestValuationRunFor,
  type ValuationRunResults,
} from "./valuations";

export type CockpitPriority = {
  id: string;
  title: string;
  category: string;
  priority: "critical" | "high" | "medium" | "low";
  estimatedWeeks: number | null;
  status: "todo" | "in_progress";
  source: "roadmap" | "assessment";
};

export type CockpitSnapshot =
  | { kind: "no_company" }
  | {
      kind: "company";
      company: Pick<Company, "id" | "name" | "country" | "sector">;
      assessment: AssessmentSnapshotState;
      valuation: ValuationSnapshotState;
      priorities: CockpitPriority[];
      attentionCount: number;
      limitingCategory: string | null;
      financialYearCount: number;
      latestFinancialYear: number | null;
      trajectory: ReturnType<typeof deriveMarketTrajectory>;
    };

function roadmapPriority(item: RoadmapItem): CockpitPriority | null {
  if (item.status === "done") return null;
  return {
    id: item.id,
    title: item.title,
    category: item.category,
    priority: item.priority,
    estimatedWeeks: item.estimatedWeeks,
    status: item.status,
    source: "roadmap",
  };
}

export async function getCockpitSnapshot(ctx: OrgContext): Promise<CockpitSnapshot> {
  const companies = await listCompanies(ctx);
  const company = companies[0];
  if (!company) return { kind: "no_company" };

  const [latestAssessment, completedAssessment, financials, valuationRun] =
    await Promise.all([
      getLatestAssessment(ctx, company.id),
      getLatestCompletedAssessment(ctx, company.id),
      listFinancialsFor(ctx, company),
      getLatestValuationRunFor(ctx, company),
    ]);

  const [completedAnswers, roadmapItems, inProgressAnswers] = await Promise.all([
    completedAssessment ? getAnswersFor(ctx, completedAssessment) : null,
    completedAssessment ? listRoadmapItemsFor(ctx, completedAssessment) : [],
    !completedAssessment && latestAssessment?.status === "in_progress"
      ? getAnswersFor(ctx, latestAssessment)
      : null,
  ]);

  let assessmentState: AssessmentSnapshotState = { kind: "missing" };
  let frozenScores: CategoryScore[] = [];
  let globalScore: number | null = null;
  let limitingCategory: string | null = null;

  const completedQuestionnaire = completedAssessment
    ? getQuestionnaire(completedAssessment.questionnaireVersion)
    : null;
  const storedReadiness =
    completedAssessment && completedQuestionnaire
      ? readStoredReadinessScores(completedQuestionnaire, completedAssessment)
      : null;

  if (
    completedAssessment &&
    storedReadiness &&
    completedAssessment.completedAt !== null
  ) {
    frozenScores = storedReadiness.categories;
    globalScore = storedReadiness.globalScore;
    limitingCategory = frozenScores.reduce<CategoryScore | null>(
      (lowest, category) => (!lowest || category.score < lowest.score ? category : lowest),
      null,
    )?.label ?? null;
    assessmentState = {
      kind: "available",
      score: globalScore,
      completedAt: completedAssessment.completedAt,
      questionnaireVersion: completedAssessment.questionnaireVersion,
      categoryScores: storedReadiness.categoryScores,
    };
  } else if (completedAssessment) {
    assessmentState = { kind: "unavailable", reason: "incomplete_snapshot" };
  } else if (latestAssessment?.status === "in_progress" && inProgressAnswers) {
    const progress = getProgress(
      getQuestionnaire(latestAssessment.questionnaireVersion),
      inProgressAnswers,
    );
    assessmentState = {
      kind: "in_progress",
      answered: progress.answered,
      total: progress.total,
    };
  }

  let priorities: CockpitPriority[];
  let attentionCount: number;
  if (assessmentState.kind !== "available") {
    priorities = [];
    attentionCount = 0;
  } else if (roadmapItems.length > 0) {
    const unresolved = roadmapItems
      .map(roadmapPriority)
      .filter((item): item is CockpitPriority => item !== null);
    priorities = unresolved.slice(0, 3);
    attentionCount = unresolved.filter(
      (item) => item.priority === "critical" || item.priority === "high",
    ).length;
  } else if (completedAssessment && completedAnswers) {
    const questionnaire = getQuestionnaire(completedAssessment.questionnaireVersion);
    priorities = rankPriorityActions(questionnaire, completedAnswers, { maxActions: 3 }).map(
      (action) => ({
        id: action.questionId,
        title: action.actionLabel,
        category: action.categoryId,
        priority: "high",
        estimatedWeeks: null,
        status: "todo",
        source: "assessment",
      }),
    );
    attentionCount = classifyCategories(frozenScores, questionnaire.thresholds).weaknesses.length;
  } else {
    priorities = [];
    attentionCount = 0;
  }

  const valuation = valuationState(
    financials.length,
    valuationRun
      ? (() => {
          const results = valuationRun.results as ValuationRunResults;
          return {
            kind: "available" as const,
            low: results.aggregated.low,
            mid: results.aggregated.mid,
            high: results.aggregated.high,
            methodCount: results.methods.length,
            skippedMethodCount: results.aggregated.methodsSkipped.length,
            refsVersion: valuationRun.refsVersion,
            createdAt: valuationRun.createdAt,
          };
        })()
      : null,
  );

  return {
    kind: "company",
    company: {
      id: company.id,
      name: company.name,
      country: company.country,
      sector: company.sector,
    },
    assessment: assessmentState,
    valuation,
    priorities,
    attentionCount,
    limitingCategory,
    financialYearCount: financials.length,
    latestFinancialYear: financials.at(-1)?.fiscalYear ?? null,
    trajectory: deriveMarketTrajectory(globalScore),
  };
}
