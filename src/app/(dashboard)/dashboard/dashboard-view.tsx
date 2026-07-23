"use client";

import { usePersona } from "@/components/layout/persona-context";
import {
  AssistantCTAPanel,
  CategoryBearingsPanel,
  companyHrefs,
  EvidenceCoveragePanel,
  ForecastHorizonPanel,
  IndicativeEquityContent,
  MarketResearchPanel,
  PointsOfAttentionContent,
  PositionCockpitPanel,
  PrioritySignalsPanel,
  ReadinessIndexContent,
  SectorBenchmarkPanel,
  SharePriceSummaryPanel,
  SnapshotProvenancePanel,
  type CompanySnapshot,
} from "./dashboard-panels";
import { InstrumentPanel } from "@/components/layout/instrument-panel";

export function DashboardView({ snapshot }: { snapshot: CompanySnapshot }) {
  const [persona] = usePersona();
  const hrefs = companyHrefs(snapshot.company.id);

  if (persona === "owner") return <OwnerView snapshot={snapshot} hrefs={hrefs} />;
  if (persona === "cfo") return <CFOView snapshot={snapshot} hrefs={hrefs} />;
  if (persona === "department_lead") return <DepartmentLeadView snapshot={snapshot} hrefs={hrefs} />;
  return <DemoView snapshot={snapshot} hrefs={hrefs} />;
}

function DemoView({
  snapshot,
  hrefs,
}: {
  snapshot: CompanySnapshot;
  hrefs: ReturnType<typeof companyHrefs>;
}) {
  return (
    <>
      <PositionCockpitPanel snapshot={snapshot} hrefs={hrefs} />
      <div className="grid gap-6 lg:grid-cols-2">
        <CategoryBearingsPanel snapshot={snapshot} hrefs={hrefs} />
        <PrioritySignalsPanel snapshot={snapshot} hrefs={hrefs} />
        <EvidenceCoveragePanel snapshot={snapshot} hrefs={hrefs} />
        <ForecastHorizonPanel snapshot={snapshot} hrefs={hrefs} />
        <SectorBenchmarkPanel snapshot={snapshot} hrefs={hrefs} />
        <SharePriceSummaryPanel snapshot={snapshot} hrefs={hrefs} />
        <MarketResearchPanel snapshot={snapshot} hrefs={hrefs} />
        <SnapshotProvenancePanel snapshot={snapshot} />
      </div>
    </>
  );
}

function OwnerView({
  snapshot,
  hrefs,
}: {
  snapshot: CompanySnapshot;
  hrefs: ReturnType<typeof companyHrefs>;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <InstrumentPanel eyebrow="Readiness index" title="IPO Readiness Score" className="lg:col-span-2">
        <ReadinessIndexContent snapshot={snapshot} assessmentHref={hrefs.assessmentHref} />
      </InstrumentPanel>

      <AssistantCTAPanel />

      <InstrumentPanel eyebrow="Indicative equity value" title="Valuation range">
        <IndicativeEquityContent snapshot={snapshot} valuationHref={hrefs.valuationHref} />
      </InstrumentPanel>

      <InstrumentPanel eyebrow="Points of attention" title="Open priorities">
        <PointsOfAttentionContent
          snapshot={snapshot}
          assessmentHref={hrefs.assessmentHref}
          roadmapHref={hrefs.roadmapHref}
        />
      </InstrumentPanel>

      <SnapshotProvenancePanel snapshot={snapshot} />
    </div>
  );
}

function CFOView({
  snapshot,
  hrefs,
}: {
  snapshot: CompanySnapshot;
  hrefs: ReturnType<typeof companyHrefs>;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <InstrumentPanel eyebrow="Indicative equity value" title="Valuation range" className="lg:col-span-2">
        <IndicativeEquityContent snapshot={snapshot} valuationHref={hrefs.valuationHref} />
      </InstrumentPanel>
      <EvidenceCoveragePanel snapshot={snapshot} hrefs={hrefs} />
      <SharePriceSummaryPanel snapshot={snapshot} hrefs={hrefs} />
      <SectorBenchmarkPanel snapshot={snapshot} hrefs={hrefs} />
      <ForecastHorizonPanel snapshot={snapshot} hrefs={hrefs} />
      <SnapshotProvenancePanel snapshot={snapshot} />
      <AssistantCTAPanel />
    </div>
  );
}

function DepartmentLeadView({
  snapshot,
  hrefs,
}: {
  snapshot: CompanySnapshot;
  hrefs: ReturnType<typeof companyHrefs>;
}) {
  const questionnaireDone = snapshot.assessment.kind === "available";

  if (!questionnaireDone) {
    return (
      <div className="grid gap-6 lg:grid-cols-3">
        <InstrumentPanel eyebrow="Readiness index" title="Diagnostic" className="lg:col-span-2">
          <ReadinessIndexContent snapshot={snapshot} assessmentHref={hrefs.assessmentHref} />
        </InstrumentPanel>
        <AssistantCTAPanel />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <InstrumentPanel eyebrow="Readiness index" title="IPO Readiness Score">
        <ReadinessIndexContent snapshot={snapshot} assessmentHref={hrefs.assessmentHref} />
      </InstrumentPanel>
      <AssistantCTAPanel />
      <CategoryBearingsPanel snapshot={snapshot} hrefs={hrefs} />
      <PrioritySignalsPanel snapshot={snapshot} hrefs={hrefs} />
    </div>
  );
}
