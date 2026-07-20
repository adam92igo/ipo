import { Building2, Check, Info, TrendingUp, X } from "lucide-react";
import Link from "next/link";
import { InstrumentPanel } from "@/components/layout/instrument-panel";
import { PageHeading } from "@/components/layout/page-heading";
import { Button } from "@/components/ui/button";
import type { SegmentAssessment } from "@/engines/market-research";
import { getCompanyMarketResearch } from "@/lib/data-access/market-research";
import { orNotFound, requireOrgPageContext } from "@/lib/data-access/page-context";

export const metadata = { title: "Market Research" };

function SegmentCard({
  assessment,
  recommended,
}: {
  assessment: SegmentAssessment;
  recommended: boolean;
}) {
  const { segment, reasons } = assessment;
  return (
    <div
      className={
        "rounded-lg border p-5 transition " +
        (recommended
          ? "border-accent bg-accent/5 ring-1 ring-accent"
          : "border-border bg-card")
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-utility text-[0.625rem] font-semibold uppercase tracking-wider text-muted-foreground">
            Tier {segment.tier}
          </p>
          <h3 className="mt-0.5 font-heading text-lg font-extrabold uppercase tracking-wide text-primary">
            {segment.label}
          </h3>
        </div>
        {recommended && (
          <span className="shrink-0 rounded-full bg-accent px-2.5 py-1 font-utility text-[0.625rem] font-bold uppercase tracking-wider text-accent-foreground">
            Recommended
          </span>
        )}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{segment.summary}</p>
      <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
        <span className="font-semibold text-primary">Best for: </span>
        {segment.bestFor}
      </p>
      <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
        {reasons.map((r) => {
          const met = r.startsWith("✓");
          const failed = r.startsWith("✗");
          const text = r.replace(/^[✓✗?•]\s*/, "");
          return (
            <li key={r} className="flex items-start gap-1.5">
              {met ? (
                <Check className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
              ) : failed ? (
                <X className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              ) : (
                <span aria-hidden className="mt-0.5">·</span>
              )}
              <span>{text}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default async function MarketResearchPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const ctx = await requireOrgPageContext();
  const {
    company,
    sectorContext,
    listingActNote,
    recommendation,
    hasValuation,
    hasFinancials,
  } = await orNotFound(() => getCompanyMarketResearch(ctx, companyId));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeading
        eyebrow="Market research instrument"
        title={company.name}
        description="The market environment for going public — sector context, the IPO climate, and the Euronext segment that fits. Orientation, not investment advice or a guarantee of admission."
        metadata={
          <span className="rounded-full border border-border bg-muted/50 px-3 py-1 font-utility text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
            {sectorContext.marketLabel}
          </span>
        }
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href={`/companies/${company.id}/benchmark`}>Benchmark</Link>
          </Button>
        }
      />

      {/* Sector market overview */}
      <InstrumentPanel eyebrow="Sector market" title="Market overview">
        <p className="max-w-3xl text-sm text-foreground">{sectorContext.sizeTrend}</p>
        <div className="mt-5">
          <p className="instrument-label">Key demand drivers</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {sectorContext.drivers.map((d) => (
              <span
                key={d}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-primary"
              >
                <TrendingUp className="size-3.5 text-accent" aria-hidden />
                {d}
              </span>
            ))}
          </div>
        </div>
      </InstrumentPanel>

      {/* IPO window */}
      <InstrumentPanel eyebrow="Going public now" title="IPO window">
        <p className="max-w-3xl text-sm text-foreground">{sectorContext.ipoWindow}</p>
        <div className="mt-5 flex items-start gap-3 rounded-md border border-border bg-muted/40 p-4">
          <Info className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
          <p className="text-xs text-muted-foreground">{listingActNote}</p>
        </div>
      </InstrumentPanel>

      {/* Segment recommendation */}
      <InstrumentPanel
        eyebrow="Where to list"
        title={
          <span className="flex items-center gap-2">
            <Building2 className="size-4" /> Euronext segment fit
          </span>
        }
      >
        <div className="mb-5 space-y-1.5 text-sm text-muted-foreground">
          {recommendation.rationale.map((r) => (
            <p key={r}>· {r}</p>
          ))}
          {!hasValuation && hasFinancials && (
            <p className="text-xs">
              Tip: run the valuation for a sharper size estimate than the revenue
              proxy.
            </p>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {recommendation.assessments.map((a) => (
            <SegmentCard
              key={a.segment.id}
              assessment={a}
              recommended={a.segment.id === recommendation.recommended}
            />
          ))}
        </div>
      </InstrumentPanel>

      {/* Sourcing */}
      <InstrumentPanel
        className="bg-muted/50"
        eyebrow="Method notes"
        title={
          <span className="flex items-center gap-2">
            <Info className="size-4" /> Sourcing & confidence
          </span>
        }
      >
        <div className="space-y-1.5 text-sm text-muted-foreground">
          <p>
            · Sector context confidence:{" "}
            <span className="font-semibold text-primary">
              {sectorContext.confidence}
            </span>
          </p>
          <p className="text-xs">{sectorContext.source}</p>
          <p className="pt-2 text-xs">
            Admission thresholds are indicative working floors for a natural fit;
            final eligibility is set by Euronext and the AMF and should be
            confirmed with a listing sponsor. Sector context is directional, not
            a live market feed.
          </p>
        </div>
      </InstrumentPanel>
    </div>
  );
}
