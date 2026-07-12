import { ArrowRight, CircleCheck, RotateCcw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RadarChart } from "@/components/charts/radar-chart";
import { ScoreGauge } from "@/components/charts/score-gauge";
import { ReadinessBearing } from "@/components/cockpit/readiness-bearing";
import { InstrumentPanel } from "@/components/layout/instrument-panel";
import { PageHeading } from "@/components/layout/page-heading";
import { Button } from "@/components/ui/button";
import {
  classifyCategories,
  rankPriorityActions,
  type PriorityAction,
} from "@/engines/scoring";
import {
  getAnswersFor,
  getLatestCompletedAssessment,
} from "@/lib/data-access/assessments";
import { getCompany } from "@/lib/data-access/companies";
import { orNotFound, requireOrgPageContext } from "@/lib/data-access/page-context";
import { getQuestionnaire } from "@/lib/questionnaire";

export const metadata = { title: "Readiness results" };

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const ctx = await requireOrgPageContext();

  const [company, assessment] = await orNotFound(() =>
    Promise.all([
      getCompany(ctx, companyId),
      getLatestCompletedAssessment(ctx, companyId),
    ]),
  );
  if (!assessment) {
    redirect(`/companies/${companyId}/assessment`);
  }

  const questionnaire = getQuestionnaire(assessment.questionnaireVersion);

  // Single source of truth: classification runs on the scores FROZEN at
  // completion, never on a recomputation against today's config.
  const categoryScores = assessment.categoryScores ?? {};
  const frozenCategories = questionnaire.categories.map((c) => ({
    id: c.id,
    label: c.label,
    score: categoryScores[c.id] ?? 0,
  }));
  const { strengths, weaknesses } = classifyCategories(
    frozenCategories,
    questionnaire.thresholds,
  );

  // Priority actions need the raw answers + config; degrade gracefully if the
  // stored answers no longer line up with the config content.
  let priorityActions: PriorityAction[] | null = null;
  try {
    const answers = await getAnswersFor(ctx, assessment);
    priorityActions = rankPriorityActions(questionnaire, answers);
  } catch {
    priorityActions = null;
  }

  const radarData = frozenCategories.map((c) => ({ label: c.label, score: c.score }));
  const global = Number(assessment.globalScore);
  const statusOf = (id: string): "strength" | "weakness" | null =>
    strengths.some((s) => s.id === id)
      ? "strength"
      : weaknesses.some((w) => w.id === id)
        ? "weakness"
        : null;
  const categoryLabel = (id: string) =>
    questionnaire.categories.find((c) => c.id === id)?.label ?? id;
  const readinessLabel =
    global >= questionnaire.thresholds.strength
      ? "Strong position"
      : global < questionnaire.thresholds.weakness
        ? "Priority attention"
        : "Advancing";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeading
        eyebrow="IPO readiness score"
        title={company.name}
        description="Frozen assessment evidence across governance, finance, growth, compliance, and reporting."
        metadata={
          <span className="border border-border bg-card px-3 py-2 font-utility text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
            Assessed{" "}
            {assessment.completedAt!.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}{" "}
            · questionnaire {assessment.questionnaireVersion}
          </span>
        }
        actions={
          <Button asChild variant="outline">
            <Link href={`/companies/${company.id}/assessment`}>
              <RotateCcw data-slot="icon" /> Reassess
            </Link>
          </Button>
        }
      />

      <InstrumentPanel className="p-0">
        <div className="grid lg:grid-cols-[0.8fr_1.5fr]">
          <div className="flex min-h-64 items-center border-b border-border p-6 lg:border-b-0 lg:border-r">
            <div>
              <p className="instrument-label">Readiness bearing</p>
              <div className="mt-5">
                <ReadinessBearing score={global} label={readinessLabel} />
              </div>
              <p className="mt-5 max-w-sm text-sm text-muted-foreground">
                Weighted average of the {questionnaire.categories.length} frozen
                category scores recorded at completion.
              </p>
            </div>
          </div>

          <section className="p-6">
            <p className="instrument-label">Assessment evidence</p>
            <h2 className="mt-1 font-heading text-2xl font-extrabold uppercase tracking-wide text-primary">
              Readiness signals
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Strength ≥ {questionnaire.thresholds.strength}% · weakness &lt;{" "}
              {questionnaire.thresholds.weakness}%
            </p>
            <div className="mt-4 flex justify-center">
              <RadarChart data={radarData} />
            </div>
          </section>
        </div>

        <div className="border-t border-border p-6">
          <h3 className="instrument-label">Category scores</h3>
          <div className="mt-4 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
            {radarData.map((d, i) => (
              <ScoreGauge
                key={d.label}
                label={d.label}
                score={d.score}
                status={statusOf(questionnaire.categories[i].id)}
              />
            ))}
          </div>
        </div>
      </InstrumentPanel>

      <div className="grid gap-6 md:grid-cols-2">
        <InstrumentPanel
          eyebrow="Positive evidence"
          title={
            <span className="flex items-center gap-2">
              <CircleCheck className="size-5 text-success" /> Strengths
            </span>
          }
        >
          <div>
            {strengths.length === 0 && (
              <p className="border-y border-border py-4 text-sm text-muted-foreground">
                No category reaches the strength threshold yet.
              </p>
            )}
            <ul
              aria-label="Strengths"
              className={
                strengths.length > 0
                  ? "divide-y divide-border border-y border-border"
                  : undefined
              }
            >
              {strengths.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <span className="text-sm font-semibold">{s.label}</span>
                  <span className="font-utility text-sm font-semibold text-success">
                    {s.score}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </InstrumentPanel>
        <InstrumentPanel
          eyebrow="Points of attention"
          title={
            <span className="flex items-center gap-2">
              <TriangleAlert className="size-5 text-destructive" /> Weaknesses
            </span>
          }
        >
          <div>
            {weaknesses.length === 0 && (
              <p className="border-y border-border py-4 text-sm text-muted-foreground">
                No category falls below the weakness threshold.
              </p>
            )}
            <ul
              aria-label="Weaknesses"
              className={
                weaknesses.length > 0
                  ? "divide-y divide-border border-y border-border"
                  : undefined
              }
            >
              {weaknesses.map((w) => (
                <li
                  key={w.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <span className="text-sm font-semibold">{w.label}</span>
                  <span className="font-utility text-sm font-semibold text-destructive">
                    {w.score}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </InstrumentPanel>
      </div>

      <InstrumentPanel eyebrow="Course corrections" title="Priority actions">
        <p className="mb-4 text-sm text-muted-foreground">
          Rules-based: the questions weighing most on your score, most impactful
          first. Continue to the roadmap for the full sequenced plan.
        </p>
        <div>
          {priorityActions === null ? (
            <p className="text-sm text-muted-foreground">
              Priority actions are unavailable for this assessment — the stored
              answers no longer match the questionnaire content. The frozen scores
              above remain valid.
            </p>
          ) : priorityActions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing to flag — every weighted question is fully satisfied.
            </p>
          ) : (
            <ol aria-label="Assessment priority actions" className="divide-y divide-border border-y border-border">
              {priorityActions.map((action, i) => (
                <li key={action.questionId} className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 py-3">
                  <span className="grid size-7 place-items-center border border-accent/50 bg-accent/10 font-utility text-[0.625rem] font-semibold text-primary">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="min-w-0 text-sm font-semibold text-primary">{action.actionLabel}</p>
                  <span className="font-utility text-[0.625rem] font-semibold uppercase tracking-wider text-muted-foreground">
                    {categoryLabel(action.categoryId)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </InstrumentPanel>

      <div className="flex justify-between">
        <Button asChild variant="ghost">
          <Link href="/companies">Back to companies</Link>
        </Button>
        <Button asChild>
          <Link href={`/companies/${company.id}/roadmap`}>
            Build the roadmap <ArrowRight data-slot="icon" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
