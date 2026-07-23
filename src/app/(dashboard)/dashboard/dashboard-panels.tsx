import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { MarketTrajectory } from "@/components/cockpit/market-trajectory";
import { MetricScale } from "@/components/cockpit/metric-scale";
import { PrioritySignalList } from "@/components/cockpit/priority-signal-list";
import { ReadinessBearing } from "@/components/cockpit/readiness-bearing";
import { SnapshotState } from "@/components/cockpit/snapshot-state";
import { ValuationEvidenceCoverage } from "@/components/cockpit/valuation-evidence";
import { InstrumentPanel } from "@/components/layout/instrument-panel";
import { Button } from "@/components/ui/button";
import type { CockpitSnapshot } from "@/lib/data-access/cockpit";

export type CompanySnapshot = Extract<CockpitSnapshot, { kind: "company" }>;

export const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function moduleAction(href: string, label: string) {
  return (
    <Button asChild size="sm" variant="outline">
      <Link href={href}>
        {label}
        <ArrowRight data-slot="icon" />
      </Link>
    </Button>
  );
}

export function categoryLabel(id: string) {
  return id
    .split(/[_-]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function companyHrefs(companyId: string) {
  return {
    assessmentHref: `/companies/${companyId}/assessment`,
    resultsHref: `/companies/${companyId}/results`,
    valuationHref: `/companies/${companyId}/valuation`,
    forecastHref: `/companies/${companyId}/forecast`,
    benchmarkHref: `/companies/${companyId}/benchmark`,
    marketHref: `/companies/${companyId}/market-research`,
    roadmapHref: `/companies/${companyId}/roadmap`,
  };
}
export type CompanyHrefs = ReturnType<typeof companyHrefs>;

export function ReadinessIndexContent({
  snapshot,
  assessmentHref,
}: {
  snapshot: CompanySnapshot;
  assessmentHref: string;
}) {
  const { assessment } = snapshot;
  if (assessment.kind === "available") {
    return (
      <ReadinessBearing
        score={assessment.score}
        label={snapshot.trajectory.current.label}
      />
    );
  }
  if (assessment.kind === "in_progress") {
    return (
      <SnapshotState
        title="Continue the diagnostic"
        description={`${assessment.answered} of ${assessment.total} questions answered. Complete the diagnostic to establish a frozen readiness score.`}
        action={moduleAction(assessmentHref, "Continue")}
      />
    );
  }
  if (assessment.kind === "unavailable") {
    return (
      <SnapshotState
        title="Rebuild the readiness snapshot"
        description="The stored assessment is incomplete, so no readiness value is shown. Complete a new assessment to restore a reliable position."
        action={moduleAction(assessmentHref, "Reassess")}
      />
    );
  }
  return (
    <SnapshotState
      title="Complete the diagnostic"
      description="Answer the readiness questions to establish your first verified IPO position."
      action={moduleAction(assessmentHref, "Start diagnostic")}
    />
  );
}

export function IndicativeEquityContent({
  snapshot,
  valuationHref,
}: {
  snapshot: CompanySnapshot;
  valuationHref: string;
}) {
  const { valuation } = snapshot;
  if (valuation.kind === "available") {
    return (
      <div>
        <MetricScale low={valuation.low} mid={valuation.mid} high={valuation.high} />
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="font-utility text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
            {valuation.methodCount} stored {valuation.methodCount === 1 ? "method" : "methods"} · refs {valuation.refsVersion}
          </p>
          {moduleAction(valuationHref, "View assumptions")}
        </div>
      </div>
    );
  }
  if (valuation.kind === "missing_financials") {
    return (
      <SnapshotState
        title="Add financial history"
        description="Record at least one fiscal year before running an indicative equity valuation."
        action={moduleAction(valuationHref, "Add financials")}
      />
    );
  }
  return (
    <SnapshotState
      title="Run the valuation"
      description="Financial history is available. Run the deterministic valuation to record an indicative range."
      action={moduleAction(valuationHref, "Open valuation")}
    />
  );
}

export function PointsOfAttentionContent({
  snapshot,
  assessmentHref,
  roadmapHref,
}: {
  snapshot: CompanySnapshot;
  assessmentHref: string;
  roadmapHref: string;
}) {
  if (snapshot.assessment.kind !== "available") {
    return (
      <div className="mt-5">
        <SnapshotState
          title="Establish priorities"
          description="Complete a reliable diagnostic before the cockpit identifies attention points."
          action={moduleAction(assessmentHref, "Open diagnostic")}
        />
      </div>
    );
  }
  return (
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
  );
}

export function RouteToMarketContent({
  snapshot,
  assessmentHref,
}: {
  snapshot: CompanySnapshot;
  assessmentHref: string;
}) {
  const { assessment } = snapshot;
  if (assessment.kind === "available") {
    return <MarketTrajectory stages={snapshot.trajectory.stages} />;
  }
  return (
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
  );
}

export function PositionCockpitPanel({
  snapshot,
  hrefs,
}: {
  snapshot: CompanySnapshot;
  hrefs: CompanyHrefs;
}) {
  return (
    <InstrumentPanel className="p-0">
      <div className="grid lg:grid-cols-[1.05fr_1.35fr_0.8fr]">
        <section className="min-h-64 border-b border-border p-5 lg:border-b-0 lg:border-r">
          <p className="instrument-label">Readiness index</p>
          <div className="mt-5">
            <ReadinessIndexContent snapshot={snapshot} assessmentHref={hrefs.assessmentHref} />
          </div>
        </section>

        <section className="min-h-64 border-b border-border p-5 lg:border-b-0 lg:border-r">
          <p className="instrument-label">Indicative equity value</p>
          <div className="mt-6">
            <IndicativeEquityContent snapshot={snapshot} valuationHref={hrefs.valuationHref} />
          </div>
        </section>

        <section className="min-h-64 p-5">
          <p className="instrument-label">Points of attention</p>
          <PointsOfAttentionContent
            snapshot={snapshot}
            assessmentHref={hrefs.assessmentHref}
            roadmapHref={hrefs.roadmapHref}
          />
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
        <RouteToMarketContent snapshot={snapshot} assessmentHref={hrefs.assessmentHref} />
      </div>
    </InstrumentPanel>
  );
}

export function CategoryBearingsPanel({
  snapshot,
  hrefs,
}: {
  snapshot: CompanySnapshot;
  hrefs: CompanyHrefs;
}) {
  const { assessment } = snapshot;
  const hasAssessment = assessment.kind === "available";
  return (
    <InstrumentPanel
      eyebrow="Readiness profile"
      title="Category bearings"
      action={moduleAction(
        hasAssessment ? hrefs.resultsHref : hrefs.assessmentHref,
        hasAssessment ? "View results" : "Open diagnostic",
      )}
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
          title={
            assessment.kind === "in_progress"
              ? "Finish every category"
              : assessment.kind === "unavailable"
                ? "Rebuild category results"
                : "Create the readiness profile"
          }
          description={
            assessment.kind === "in_progress"
              ? "Category bars appear after the assessment is complete."
              : assessment.kind === "unavailable"
                ? "The saved category snapshot is incomplete and cannot be displayed reliably."
                : "Complete the diagnostic to compare readiness across each category."
          }
          action={moduleAction(hrefs.assessmentHref, assessment.kind === "in_progress" ? "Continue" : "Open diagnostic")}
        />
      )}
    </InstrumentPanel>
  );
}

export function PrioritySignalsPanel({
  snapshot,
  hrefs,
}: {
  snapshot: CompanySnapshot;
  hrefs: CompanyHrefs;
}) {
  const { assessment, company } = snapshot;
  return (
    <InstrumentPanel eyebrow="Course corrections" title="Priority signals" action={moduleAction(hrefs.roadmapHref, "View roadmap")}>
      {assessment.kind === "available" && snapshot.priorities.length > 0 ? (
        <PrioritySignalList companyId={company.id} items={snapshot.priorities} />
      ) : assessment.kind === "unavailable" ? (
        <SnapshotState
          title="Rebuild the diagnostic snapshot"
          description="The stored assessment is incomplete, so its priority signals are unavailable. Complete a new assessment before using these actions."
          action={moduleAction(hrefs.assessmentHref, "Reassess")}
        />
      ) : assessment.kind === "in_progress" ? (
        <SnapshotState
          title="Finish the diagnostic"
          description={`${assessment.answered} of ${assessment.total} questions answered. Priority signals appear after the assessment is complete.`}
          action={moduleAction(hrefs.assessmentHref, "Continue diagnostic")}
        />
      ) : assessment.kind === "missing" ? (
        <SnapshotState
          title="Complete the diagnostic first"
          description="Priority actions are derived from completed assessment evidence."
          action={moduleAction(hrefs.assessmentHref, "Start diagnostic")}
        />
      ) : (
        <SnapshotState
          title="Review the action plan"
          description="No unfinished priority signals are available in this snapshot. Open the roadmap to generate or review the next actions."
          action={moduleAction(hrefs.roadmapHref, "Open roadmap")}
        />
      )}
    </InstrumentPanel>
  );
}

export function EvidenceCoveragePanel({
  snapshot,
  hrefs,
}: {
  snapshot: CompanySnapshot;
  hrefs: CompanyHrefs;
}) {
  const { valuation } = snapshot;
  return (
    <InstrumentPanel eyebrow="Valuation confidence" title="Evidence coverage" action={moduleAction(hrefs.valuationHref, "Open valuation")}>
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
          description={
            valuation.kind === "missing_financials"
              ? "Add financial history to make valuation methods available."
              : "Run the valuation to record method coverage and reference provenance."
          }
          action={moduleAction(hrefs.valuationHref, valuation.kind === "missing_financials" ? "Add financials" : "Run valuation")}
        />
      )}
    </InstrumentPanel>
  );
}

export function ForecastHorizonPanel({
  snapshot,
  hrefs,
}: {
  snapshot: CompanySnapshot;
  hrefs: CompanyHrefs;
}) {
  const hasFinancials = snapshot.financialYearCount > 0;
  return (
    <InstrumentPanel
      eyebrow="Financial outlook"
      title="Forecast horizon"
      action={moduleAction(hrefs.forecastHref, hasFinancials ? "Open forecast" : "Add financials")}
    >
      {hasFinancials ? (
        <div>
          <p className="text-sm text-muted-foreground">
            A deterministic 5-year projection of revenue, EBITDA and free
            cash flow, built from{" "}
            <span className="font-semibold text-primary">{snapshot.financialYearCount}</span>{" "}
            stored {snapshot.financialYearCount === 1 ? "year" : "years"} of history.
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="border-t pt-3">
              <dt className="instrument-label">Horizon</dt>
              <dd className="mt-1 font-medium text-primary">5 years</dd>
            </div>
            <div className="border-t pt-3">
              <dt className="instrument-label">Latest actual</dt>
              <dd className="mt-1 font-medium text-primary">{snapshot.latestFinancialYear ?? "—"}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <SnapshotState
          title="Project the numbers forward"
          description="Add at least one fiscal year of financials to unlock a multi-year revenue, EBITDA and cash-flow forecast."
          action={moduleAction(hrefs.valuationHref, "Add financials")}
        />
      )}
    </InstrumentPanel>
  );
}

export function SectorBenchmarkPanel({
  snapshot,
  hrefs,
}: {
  snapshot: CompanySnapshot;
  hrefs: CompanyHrefs;
}) {
  const { company } = snapshot;
  const hasFinancials = snapshot.financialYearCount > 0;
  const hasAssessment = snapshot.assessment.kind === "available";
  return (
    <InstrumentPanel eyebrow="Peer comparison" title="Sector benchmark" action={moduleAction(hrefs.benchmarkHref, "Open benchmark")}>
      <p className="text-sm text-muted-foreground">
        See how {company.name} compares to its{" "}
        <span className="font-semibold text-primary">{company.sector}</span>{" "}
        sector — implied multiples, financial ratios and IPO-readiness against
        the target, next to curated listed peers.
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="border-t pt-3">
          <dt className="instrument-label">Ratios</dt>
          <dd className="mt-1 font-medium text-primary">{hasFinancials ? "From latest accounts" : "Add financials"}</dd>
        </div>
        <div className="border-t pt-3">
          <dt className="instrument-label">Readiness</dt>
          <dd className="mt-1 font-medium text-primary">{hasAssessment ? "Scored vs target" : "Complete diagnostic"}</dd>
        </div>
      </dl>
    </InstrumentPanel>
  );
}

export function SharePriceSummaryPanel({
  snapshot,
  hrefs,
}: {
  snapshot: CompanySnapshot;
  hrefs: CompanyHrefs;
}) {
  const { valuation } = snapshot;
  return (
    <InstrumentPanel
      eyebrow="Share price"
      title="Share price"
      action={moduleAction(hrefs.valuationHref, valuation.kind === "available" ? "View price" : "Run valuation")}
    >
      {valuation.kind === "available" ? (
        <p className="text-sm text-muted-foreground">
          Indicative price per share derived from the valuation range, pre-
          and post-IPO dilution. Enter the share count on the Valuation page
          to display it.
        </p>
      ) : (
        <SnapshotState
          title="Calculate the share price"
          description="Run the valuation first, then enter the share count to get an indicative pre- and post-dilution price."
          action={moduleAction(hrefs.valuationHref, valuation.kind === "missing_financials" ? "Add financials" : "Run valuation")}
        />
      )}
    </InstrumentPanel>
  );
}

export function MarketResearchPanel({
  snapshot,
  hrefs,
}: {
  snapshot: CompanySnapshot;
  hrefs: CompanyHrefs;
}) {
  const { company, valuation } = snapshot;
  const hasFinancials = snapshot.financialYearCount > 0;
  return (
    <InstrumentPanel eyebrow="Where to list" title="Market research" action={moduleAction(hrefs.marketHref, "Open market research")}>
      <p className="text-sm text-muted-foreground">
        The IPO climate for <span className="font-semibold text-primary">{company.sector}</span>,
        its market drivers, and which Euronext segment — Access, Access+,
        Growth or the regulated market — fits {company.name} by size and track
        record.
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="border-t pt-3">
          <dt className="instrument-label">Segment fit</dt>
          <dd className="mt-1 font-medium text-primary">
            {valuation.kind === "available" ? "From valuation size" : hasFinancials ? "From revenue proxy" : "Add financials"}
          </dd>
        </div>
        <div className="border-t pt-3">
          <dt className="instrument-label">Sector climate</dt>
          <dd className="mt-1 font-medium text-primary">Curated overview</dd>
        </div>
      </dl>
    </InstrumentPanel>
  );
}

export function SnapshotProvenancePanel({ snapshot }: { snapshot: CompanySnapshot }) {
  const { assessment, valuation } = snapshot;
  return (
    <InstrumentPanel eyebrow="Data freshness" title="Snapshot provenance" action={moduleAction("/companies", "Company profile")}>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="border-b pb-3">
          <dt className="instrument-label">Assessment</dt>
          <dd className="mt-1 font-medium text-primary">
            {assessment.kind === "available"
              ? dateFormatter.format(assessment.completedAt)
              : assessment.kind === "in_progress"
                ? "In progress"
                : assessment.kind === "unavailable"
                  ? "Stored snapshot incomplete"
                  : "Not completed"}
          </dd>
          {assessment.kind === "available" && (
            <dd className="font-utility text-[0.625rem] text-muted-foreground">{assessment.questionnaireVersion}</dd>
          )}
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
            {snapshot.priorities[0]?.source === "roadmap"
              ? "Current roadmap"
              : snapshot.priorities[0]?.source === "assessment"
                ? "Stored assessment"
                : "No active source"}
          </dd>
        </div>
      </dl>
    </InstrumentPanel>
  );
}

export function AssistantCTAPanel() {
  return (
    <InstrumentPanel eyebrow="Always available" title="IPO assistant" className="border-accent">
      <p className="text-sm text-muted-foreground">
        Ask the contextual IPO assistant about this company&apos;s readiness,
        valuation, or roadmap — it answers from your stored data.
      </p>
      <div className="mt-4">
        <Button asChild size="sm">
          <Link href="/assistant">
            Ask assistant
            <ArrowRight data-slot="icon" />
          </Link>
        </Button>
      </div>
    </InstrumentPanel>
  );
}
