import { ArrowRight, CircleCheck, RotateCcw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RadarChart } from "@/components/charts/radar-chart";
import { ScoreGauge } from "@/components/charts/score-gauge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm uppercase italic tracking-wider text-secondary">
            /IPO readiness score/
          </p>
          <h1 className="text-3xl font-extrabold text-primary">{company.name}</h1>
          <p className="text-muted-foreground">
            Assessed on{" "}
            {assessment.completedAt!.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}{" "}
            · questionnaire {assessment.questionnaireVersion}
          </p>
        </div>
        <Button asChild variant="outline" className="uppercase tracking-[0.15em]">
          <Link href={`/companies/${company.id}/assessment`}>
            <RotateCcw data-slot="icon" /> Reassess
          </Link>
        </Button>
      </div>

      {/* Hero score + radar */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card className="flex flex-col justify-center">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm uppercase italic tracking-wider text-secondary">
              /Global score/
            </p>
            <p className="text-7xl font-extrabold text-primary">
              {Math.round(global)}
              <span className="text-3xl">%</span>
            </p>
            <p className="max-w-xs text-sm text-muted-foreground">
              Weighted average of the {questionnaire.categories.length} readiness
              categories below.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-center py-6">
            <RadarChart data={radarData} />
          </CardContent>
        </Card>
      </div>

      {/* Gauges */}
      <Card>
        <CardHeader>
          <CardTitle className="text-primary">Category scores</CardTitle>
          <CardDescription>
            Strength ≥ {questionnaire.thresholds.strength}% · weakness &lt;{" "}
            {questionnaire.thresholds.weakness}%
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
          {radarData.map((d, i) => (
            <ScoreGauge
              key={d.label}
              label={d.label}
              score={d.score}
              status={statusOf(questionnaire.categories[i].id)}
            />
          ))}
        </CardContent>
      </Card>

      {/* Strengths / weaknesses / priority actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <CircleCheck className="size-5" /> Strengths
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {strengths.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No category reaches the strength threshold yet.
              </p>
            )}
            {strengths.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-sm bg-muted px-3 py-2">
                <span className="text-sm font-semibold">{s.label}</span>
                <span className="text-sm font-bold text-primary">{s.score}%</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <TriangleAlert className="size-5" /> Weaknesses
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {weaknesses.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No category falls below the weakness threshold.
              </p>
            )}
            {weaknesses.map((w) => (
              <div key={w.id} className="flex items-center justify-between rounded-sm bg-muted px-3 py-2">
                <span className="text-sm font-semibold">{w.label}</span>
                <span className="text-sm font-bold text-destructive">{w.score}%</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-primary">Priority actions</CardTitle>
          <CardDescription>
            Rules-based: the questions weighing most on your score, most impactful
            first. The full roadmap arrives with module 4.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
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
            priorityActions.map((action, i) => (
              <div key={action.questionId} className="flex items-start gap-3 rounded-sm border px-4 py-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <p className="min-w-0 flex-1 font-medium">{action.actionLabel}</p>
                <Badge variant="outline" className="uppercase">
                  {categoryLabel(action.categoryId)}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button asChild variant="ghost" className="uppercase tracking-[0.15em]">
          <Link href="/companies">Back to companies</Link>
        </Button>
        <Button asChild className="uppercase tracking-[0.15em]">
          <Link href={`/companies/${company.id}/roadmap`}>
            Build the roadmap <ArrowRight data-slot="icon" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
