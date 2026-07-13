import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MarketTrajectory } from "./market-trajectory";
import { MetricScale } from "./metric-scale";
import { PrioritySignalList } from "./priority-signal-list";
import { ReadinessBearing } from "./readiness-bearing";
import { SnapshotState } from "./snapshot-state";
import { ValuationEvidenceCoverage } from "./valuation-evidence";

describe("cockpit components", () => {
  it("reports both included and skipped valuation methods", () => {
    const html = renderToStaticMarkup(
      createElement(ValuationEvidenceCoverage, {
        methodCount: 2,
        skippedMethodCount: 1,
        financialYearCount: 3,
        refsVersion: "valuation-refs.v1",
      }),
    );

    expect(html).toContain("Methods in range");
    expect(html).toContain(">2<");
    expect(html).toContain("Methods skipped");
    expect(html).toContain(">1<");
  });

  it("renders the readiness score as text, not only graphics", () => {
    const html = renderToStaticMarkup(
      createElement(ReadinessBearing, { score: 72, label: "Advancing" }),
    );
    expect(html).toContain("72%");
    expect(html).toContain("Advancing");
    expect(html).toContain('aria-label="IPO readiness: 72%, Advancing"');
  });

  it("renders the trajectory as an ordered list with textual states", () => {
    const stages = [
      { id: "foundation" as const, label: "Foundation", state: "completed" as const },
      {
        id: "financial_control" as const,
        label: "Financial control",
        state: "current" as const,
      },
      { id: "governance" as const, label: "Governance", state: "future" as const },
    ];
    const html = renderToStaticMarkup(createElement(MarketTrajectory, { stages }));
    expect(html).toContain("<ol");
    expect(html).toContain("Foundation — completed");
    expect(html).toContain("Financial control — current");
  });

  it("labels low, midpoint, and high values", () => {
    const html = renderToStaticMarkup(
      createElement(MetricScale, { low: 18_400_000, mid: 21_500_000, high: 24_700_000 }),
    );
    expect(html).toContain("Low");
    expect(html).toContain("Midpoint");
    expect(html).toContain("High");
    expect(html).toContain("49.2063492063492%");
  });

  it("centres the midpoint when the range is equal", () => {
    const html = renderToStaticMarkup(
      createElement(MetricScale, { low: 20_000_000, mid: 20_000_000, high: 20_000_000 }),
    );
    expect(html).toContain("left:50%");
  });

  it("routes priorities to their source module", () => {
    const html = renderToStaticMarkup(
      createElement(PrioritySignalList, {
        companyId: "company-1",
        items: [
          {
            id: "roadmap-1",
            title: "Appoint an independent director",
            category: "governance",
            priority: "critical",
            estimatedWeeks: 8,
            status: "in_progress",
            source: "roadmap",
          },
          {
            id: "assessment-1",
            title: "Formalise monthly reporting",
            category: "reporting",
            priority: "high",
            estimatedWeeks: null,
            status: "todo",
            source: "assessment",
          },
        ],
      }),
    );
    expect(html).toContain('href="/companies/company-1/roadmap"');
    expect(html).toContain('href="/companies/company-1/results"');
  });

  it("renders direction-first state copy with an action", () => {
    const html = renderToStaticMarkup(
      createElement(SnapshotState, {
        title: "Complete the diagnostic",
        description: "Answer the readiness questions to establish your first position.",
        action: createElement("a", { href: "/assessment" }, "Start diagnostic"),
      }),
    );
    expect(html).toContain("Complete the diagnostic");
    expect(html).toContain("Start diagnostic");
    expect(html).toContain('href="/assessment"');
  });
});
