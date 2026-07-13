import { ArrowRight, Building2, CalendarClock } from "lucide-react";
import Link from "next/link";
import { MarketTrajectory } from "@/components/cockpit/market-trajectory";
import { MetricScale } from "@/components/cockpit/metric-scale";
import { PrioritySignalList } from "@/components/cockpit/priority-signal-list";
import { ReadinessBearing } from "@/components/cockpit/readiness-bearing";
import { SnapshotState } from "@/components/cockpit/snapshot-state";
import { ValuationEvidenceCoverage } from "@/components/cockpit/valuation-evidence";
import { InstrumentPanel } from "@/components/layout/instrument-panel";
import { PageHeading } from "@/components/layout/page-heading";
import { Button } from "@/components/ui/button";
import { getCockpitSnapshot } from "@/lib/data-access/cockpit";
import { requireOrgPageContext } from "@/lib/data-access/page-context";

export const metadata = { title: "Overview" };

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function moduleAction(href: string, label: string) {
  return (
    <Button asChild size="sm" variant="outline">
      <Link href={href}>
        {label}
        <ArrowRight data-slot="icon" />
      </Link>
    </Button>
  );
}

function categoryLabel(id: string) {
  return id
    .split(/[_-]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default async function DashboardPage() {
  const ctx = await requireOrgPageContext();
  const snapshot = await getCockpitSnapshot(ctx);

  if (snapshot.kind === "no_company") {
    return (
      <div className="mx-auto max-w-5xl space-y-8">
        <PageHeading
          eyebrow="Overview"
          title={ctx.organizationName}
          description="Your IPO readiness workspace. Start by adding the company you manage."
        />
        <InstrumentPanel className="flex flex-col items-center py-14 text-center">
          <div className="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground">
            <Building2 className="size-5" />
          </div>
          <h2 className="mt-4 font-heading text-2xl font-extrabold uppercase text-primary">
            Add your company
          </h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Create the company profile to unlock the diagnostic, valuation, roadmap, and assistant.
          </p>
          <Button asChild className="mt-5">
            <Link href="/companies">Add a company</Link>
          </Button>
        </InstrumentPanel>
      </div>
    );
  }

  const { company, assessment, valuation } = snapshot;
  const assessmentHref = `/companies/${company.id}/assessment`;
  const resultsHref = `/companies/${company.id}/results`;
  const valuationHref = `/companies/${company.id}/valuation`;
  const roadmapHref = `/companies/${company.id}/roadmap`;
  const hasAssessment = assessment.kind === "available";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeading
        eyebrow="IPO position cockpit"
        title={company.name}
        description="Your latest stored readiness position, valuation evidence, and next public-market actions."
        metadata={
          <span className="inline-flex items-center gap-2 border border-border bg-card px-3 py-2 font-utility text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
            <CalendarClock className="size-3.5" />
            Data snapshot · stored records
          </span>
        }
        actions={
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/companies">Company profile</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/assistant">Ask assistant</Link>
            </Button>
          </div>
        }
      />

      <InstrumentPanel className="p-0">
        <div className="grid lg:grid-cols-[1.05fr_1.35fr_0.8fr]">
          <section className="min-h-64 border-b border-border p-5 lg:border-b-0 lg:border-r">
            <p className="instrument-label">Readiness index</p>
            <div className="mt-5">
              {assessment.kind === "available" ? (
                <ReadinessBearing
                  score={assessment.score}
                  label={snapshot.trajectory.current.label}
                />
              ) : assessment.kind === "in_progress" ? (
                <SnapshotState
                  title="Continue the diagnostic"
                  description={`${assessment.answered} of ${assessment.total} questions answered. Complete the diagnostic to establish a frozen readiness score.`}
                  action={moduleAction(assessmentHref, "Continue")}
                />
              ) : assessment.kind === "unavailable" ? (
                <SnapshotState
                  title="Rebuild the readiness snapshot"
                  description="The stored assessment is incomplete, so no readiness value is shown. Complete a new assessment to restore a reliable position."
                  action={moduleAction(assessmentHref, "Reassess")}
                />
              ) : (
                <SnapshotState
                  title="Complete the diagnostic"
                  description="Answer the readiness questions to establish your first verified IPO position."
                  action={moduleAction(assessmentHref, "Start diagnostic")}
                />
              )}
            </div>
          </section>

          <section className="min-h-64 border-b border-border p-5 lg:border-b-0 lg:border-r">
            <p className="instrument-label">Indicative equity value</p>
            <div className="mt-6">
              {valuation.kind === "available" ? (
                <div>
                  <MetricScale low={valuation.low} mid={valuation.mid} high={valuation.high} />
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                    <p className="font-utility text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
                      {valuation.methodCount} stored {valuation.methodCount === 1 ? "method" : "methods"} · refs {valuation.refsVersion}
                    </p>
                    {moduleAction(valuationHref, "View assumptions")}
                  </div>
                </div>
              ) : valuation.kind === "missing_financials" ? (
                <SnapshotState
                  title="Add financial history"
                  description="Record at least one fiscal year before running an indicative equity valuation."
                  action={moduleAction(valuationHref, "Add financials")}
                />
              ) : (
                <SnapshotState
                  title="Run the valuation"
                  description="Financial history is available. Run the deterministic valuation to store an indicative range."
                  action={moduleAction(valuationHref, "Open valuation")}
                />
              )}
            </div>
          </section>

          <section className="min-h-64 p-5">
            <p className="instrument-label">Points of attention</p>
            {hasAssessment ? (
              <div className="mt-5">
                <p className="font-heading text-7xl font-extrabold leading-none text-primary">
                  {snapshot.attentionCount}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {snapshot.limitingCategory
                    ? `${snapshot.limitingCategory} currently limits readiness.`
                    : "No limiting category is identified in the stored assessment."}
                </p>
                <div className="mt-5">{moduleAction(roadmapHref, "Open roadmap")}</div>
              </div>
            ) : (
              <div className="mt-5">
                <SnapshotState
                  title="Establish priorities"
                  description="Complete a reliable diagnostic before the cockpit identifies attention points."
                  action={moduleAction(assessmentHref, "Open diagnostic")}
                />
              </div>
            )}
          </section>
        </div>

        <div className="border-t border-border">
          <div className="flex items-center justify-between px-5 py-3">
            <h2 className="font-heading text-lg font-extrabold uppercase tracking-wide text-primary">
              Route to market
            </h2>
            <span className="font-utility text-[0.625rem] font-semibold uppercase tracking-wider text-muted-foreground">
              Presentation of frozen readiness
            </span>
          </div>
          {assessment.kind === "available" ? (
            <MarketTrajectory stages={snapshot.trajectory.stages} />
          ) : (
            <div className="border-t border-border bg-card p-5">
              {assessment.kind === "in_progress" ? (
                <SnapshotState
                  title="Complete the route baseline"
                  description={`${assessment.answered} of ${assessment.total} questions answered. Finish the diagnostic before a route-to-market position is shown.`}
                  action={moduleAction(assessmentHref, "Continue diagnostic")}
                />
              ) : assessment.kind === "unavailable" ? (
                <SnapshotState
                  title="Rebuild the route baseline"
                  description="The stored assessment snapshot is incomplete, so no route-to-market position is shown. Complete a new assessment to restore it."
                  action={moduleAction(assessmentHref, "Reassess")}
                />
              ) : (
                <SnapshotState
                  title="Establish the route baseline"
                  description="Complete the diagnostic before the cockpit places the company on its route to market."
                  action={moduleAction(assessmentHref, "Start diagnostic")}
                />
              )}
            </div>
          )}
        </div>
      </InstrumentPanel>

      <div className="grid gap-6 lg:grid-cols-2">
        <InstrumentPanel
          eyebrow="Readiness profile"
          title="Category bearings"
          action={moduleAction(hasAssessment ? resultsHref : assessmentHref, hasAssessment ? "View results" : "Open diagnostic")}
        >
          {assessment.kind === "available" ? (
            <div className="space-y-4">
              {Object.entries(assessment.categoryScores).map(([category, score]) => (
                <div key={category}>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-primary">{categoryLabel(category)}</span>
                    <span className="font-utility text-xs font-semibold text-primary">{Math.round(score)}%</span>
                  </div>
                  <div
                    className="h-2 bg-muted"
                    role="meter"
                    aria-label={categoryLabel(category)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(score)}
                  >
                    <div className="h-full bg-primary" style={{ width: `${score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <SnapshotState
              title={assessment.kind === "in_progress" ? "Finish every category" : assessment.kind === "unavailable" ? "Rebuild category results" : "Create the readiness profile"}
              description={assessment.kind === "in_progress" ? "Category bars appear after the assessment is complete." : assessment.kind === "unavailable" ? "The saved category snapshot is incomplete and cannot be displayed reliably." : "Complete the diagnostic to compare readiness across each category."}
              action={moduleAction(assessmentHref, assessment.kind === "in_progress" ? "Continue" : "Open diagnostic")}
            />
          )}
        </InstrumentPanel>

        <InstrumentPanel
          eyebrow="Course corrections"
          title="Priority signals"
          action={moduleAction(roadmapHref, "View roadmap")}
        >
          {assessment.kind === "available" && snapshot.priorities.length > 0 ? (
            <PrioritySignalList companyId={company.id} items={snapshot.priorities} />
          ) : assessment.kind === "unavailable" ? (
            <SnapshotState
              title="Rebuild the diagnostic snapshot"
              description="The stored assessment is incomplete, so its priority signals are unavailable. Complete a new assessment before using these actions."
              action={moduleAction(assessmentHref, "Reassess")}
            />
          ) : assessment.kind === "in_progress" ? (
            <SnapshotState
              title="Finish the diagnostic"
              description={`${assessment.answered} of ${assessment.total} questions answered. Priority signals appear after the assessment is complete.`}
              action={moduleAction(assessmentHref, "Continue diagnostic")}
            />
          ) : assessment.kind === "missing" ? (
            <SnapshotState
              title="Complete the diagnostic first"
              description="Priority actions are derived from completed assessment evidence."
              action={moduleAction(assessmentHref, "Start diagnostic")}
            />
          ) : (
            <SnapshotState
              title="Review the action plan"
              description="No unfinished priority signals are available in this snapshot. Open the roadmap to generate or review the next actions."
              action={moduleAction(roadmapHref, "Open roadmap")}
            />
          )}
        </InstrumentPanel>

        <InstrumentPanel
          eyebrow="Valuation confidence"
          title="Evidence coverage"
          action={moduleAction(valuationHref, "Open valuation")}
        >
          {valuation.kind === "available" ? (
            <ValuationEvidenceCoverage
              methodCount={valuation.methodCount}
              skippedMethodCount={valuation.skippedMethodCount}
              financialYearCount={snapshot.financialYearCount}
              refsVersion={valuation.refsVersion}
            />
          ) : (
            <SnapshotState
              title={valuation.kind === "missing_financials" ? "Build the evidence base" : "Calculate the stored range"}
              description={valuation.kind === "missing_financials" ? "Add financial history to make valuation methods available." : "Run the valuation to record method coverage and reference provenance."}
              action={moduleAction(valuationHref, valuation.kind === "missing_financials" ? "Add financials" : "Run valuation")}
            />
          )}
        </InstrumentPanel>

        <InstrumentPanel
          eyebrow="Data freshness"
          title="Snapshot provenance"
          action={moduleAction("/companies", "Company profile")}
        >
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="border-b pb-3">
              <dt className="instrument-label">Assessment</dt>
              <dd className="mt-1 font-medium text-primary">
                {assessment.kind === "available" ? dateFormatter.format(assessment.completedAt) : assessment.kind === "in_progress" ? "In progress" : assessment.kind === "unavailable" ? "Stored snapshot incomplete" : "Not completed"}
              </dd>
              {assessment.kind === "available" && <dd className="font-utility text-[0.625rem] text-muted-foreground">{assessment.questionnaireVersion}</dd>}
            </div>
            <div className="border-b pb-3">
              <dt className="instrument-label">Latest financial year</dt>
              <dd className="mt-1 font-medium text-primary">{snapshot.latestFinancialYear ?? "Not recorded"}</dd>
            </div>
            <div className="border-b pb-3">
              <dt className="instrument-label">Valuation run</dt>
              <dd className="mt-1 font-medium text-primary">{valuation.kind === "available" ? dateFormatter.format(valuation.createdAt) : "Not run"}</dd>
            </div>
            <div className="border-b pb-3">
              <dt className="instrument-label">Priority source</dt>
              <dd className="mt-1 font-medium text-primary">
                {snapshot.priorities[0]?.source === "roadmap" ? "Current roadmap" : snapshot.priorities[0]?.source === "assessment" ? "Stored assessment" : "No active source"}
              </dd>
            </div>
          </dl>
        </InstrumentPanel>
      </div>
    </div>
  );
}
