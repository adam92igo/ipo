"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

const PERSONAS = ["demo", "owner", "cfo", "department_lead"] as const;
type Persona = (typeof PERSONAS)[number];

const PERSONA_LABELS: Record<Persona, string> = {
  demo: "Demo",
  owner: "Owner",
  cfo: "CFO",
  department_lead: "Department Lead",
};

const STORAGE_KEY = "ipo-compass:dashboard-persona";

function isPersona(value: string | null): value is Persona {
  return !!value && (PERSONAS as readonly string[]).includes(value);
}

function usePersistedPersona(): [Persona, (next: Persona) => void] {
  const [persona, setPersona] = useState<Persona>("demo");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isPersona(stored)) setPersona(stored);
  }, []);

  const update = (next: Persona) => {
    setPersona(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  return [persona, update];
}

export function DashboardView({ snapshot }: { snapshot: CompanySnapshot }) {
  const [persona, setPersona] = usePersistedPersona();
  const hrefs = companyHrefs(snapshot.company.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 border border-border bg-card p-1.5">
        {PERSONAS.map((option) => (
          <Button
            key={option}
            type="button"
            size="sm"
            variant={persona === option ? "default" : "ghost"}
            className={cn(persona !== option && "text-muted-foreground")}
            onClick={() => setPersona(option)}
          >
            {PERSONA_LABELS[option]}
          </Button>
        ))}
      </div>

      {persona === "demo" && <DemoView snapshot={snapshot} hrefs={hrefs} />}
      {persona === "owner" && <OwnerView snapshot={snapshot} hrefs={hrefs} />}
      {persona === "cfo" && <CFOView snapshot={snapshot} hrefs={hrefs} />}
      {persona === "department_lead" && <DepartmentLeadView snapshot={snapshot} hrefs={hrefs} />}
    </div>
  );
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
