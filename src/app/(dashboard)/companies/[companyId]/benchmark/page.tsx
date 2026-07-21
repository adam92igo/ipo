import { Info, Minus, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { BenchmarkBandChart } from "@/components/charts/benchmark-band-chart";
import { InstrumentPanel } from "@/components/layout/instrument-panel";
import { PageHeading } from "@/components/layout/page-heading";
import { Button } from "@/components/ui/button";
import { getCompanyBenchmark } from "@/lib/data-access/benchmark";
import { orNotFound, requireOrgPageContext } from "@/lib/data-access/page-context";
import { getPeerCompaniesFile } from "@/lib/peer-companies";

export const metadata = { title: "Benchmark" };

export default async function BenchmarkPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const ctx = await requireOrgPageContext();
  const { company, result } = await orNotFound(() =>
    getCompanyBenchmark(ctx, companyId),
  );

  const peersNote = getPeerCompaniesFile(result.peersVersion).note;
  const readinessScored = result.readiness.filter((r) => r.score !== null);
  const meets = readinessScored.filter((r) => r.meetsTarget).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeading
        eyebrow="Benchmark instrument"
        title={company.name}
        description="How this company compares to its sector — implied multiples, financial ratios and IPO readiness. Indicative reference points, not investment advice."
        metadata={
          <span className="rounded-full border border-border bg-muted/50 px-3 py-1 font-utility text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
            {result.sectorLabel} · refs {result.refsVersion} · peers{" "}
            {result.peersVersion}
          </span>
        }
        actions={
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/companies/${company.id}/forecast`}>Forecast</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/companies/${company.id}/market-research`}>Market</Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/companies/${company.id}/roadmap`}>Fix gaps</Link>
            </Button>
          </div>
        }
      />

      {/* Section 1 — multiples & ratios vs sector bands */}
      <InstrumentPanel
        eyebrow="Versus sector"
        title="Multiples & financial ratios"
      >
        <p className="mb-5 max-w-3xl text-sm text-muted-foreground">
          Each grey band is the sector reference range; the dot is where this
          company sits. Sector multiples are the bands the valuation engine
          applies — a pre-IPO SME has no traded EV, so those rows show the band
          only. Margins and conversion are derived from the latest accounts.
        </p>
        <BenchmarkBandChart metrics={result.metrics} />
      </InstrumentPanel>

      {/* Section 2 — readiness vs IPO-ready target */}
      <InstrumentPanel
        eyebrow="Versus IPO-ready bar"
        title={
          <span className="flex items-center gap-3">
            Readiness by category
            {readinessScored.length > 0 && (
              <span className="font-utility text-sm font-semibold tabular-nums text-muted-foreground">
                {meets}/{readinessScored.length} at target
              </span>
            )}
          </span>
        }
      >
        <p className="mb-5 max-w-3xl text-sm text-muted-foreground">
          The IPO-ready target is {result.readinessTarget}. Bars show each
          category score against it.
        </p>
        {readinessScored.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No completed assessment yet — complete the diagnostic to populate
            readiness benchmarks. Target for every category is{" "}
            {result.readinessTarget}.
          </p>
        ) : (
          <div className="space-y-3">
            {result.readiness.map((r) => {
              const score = r.score ?? 0;
              const target = r.target;
              return (
                <div key={r.categoryId} className="flex items-center gap-4">
                  <div className="w-28 shrink-0 text-sm font-medium text-foreground">
                    {r.label}
                  </div>
                  <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-muted">
                    {/* score fill */}
                    <div
                      className="absolute inset-y-0 left-0 rounded-md"
                      style={{
                        width: `${score}%`,
                        background:
                          r.meetsTarget === true
                            ? "var(--color-chart-3)"
                            : "var(--color-chart-4)",
                        opacity: 0.85,
                      }}
                    />
                    {/* target marker */}
                    <div
                      className="absolute inset-y-0 w-0.5 bg-primary"
                      style={{ left: `${target}%` }}
                      title={`Target ${target}`}
                    />
                  </div>
                  <div className="flex w-24 shrink-0 items-center justify-end gap-1 font-utility text-sm tabular-nums">
                    <span className="font-semibold text-foreground">
                      {r.score}
                    </span>
                    {r.gap !== null && (
                      <span
                        className="flex items-center text-xs text-muted-foreground"
                        title={`${r.gap >= 0 ? "+" : ""}${r.gap} vs target`}
                      >
                        {r.gap > 0 ? (
                          <TrendingUp className="size-3.5" aria-hidden />
                        ) : r.gap < 0 ? (
                          <TrendingDown className="size-3.5" aria-hidden />
                        ) : (
                          <Minus className="size-3.5" aria-hidden />
                        )}
                        {r.gap >= 0 ? "+" : ""}
                        {r.gap}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </InstrumentPanel>

      {/* Section 3 — named peer comparables */}
      <InstrumentPanel eyebrow="Comparable companies" title="Sector peers">
        <p className="mb-5 max-w-3xl text-sm text-muted-foreground">
          Illustrative recently-listed / mid-cap comparables for {result.sectorLabel}
          . Indicative trading multiples for orientation — not live quotes.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-4">Company</th>
                <th className="py-2 pr-4">Market</th>
                <th className="py-2 pr-4 text-right">EV/EBITDA</th>
                <th className="py-2 pr-4 text-right">EV/Revenue</th>
              </tr>
            </thead>
            <tbody>
              {result.peers.map((p) => (
                <tr
                  key={p.name}
                  className="border-b border-border/60 last:border-0 align-top"
                >
                  <td className="py-2 pr-4">
                    <span className="font-medium text-foreground">{p.name}</span>
                    <span className="mt-0.5 block max-w-md text-xs text-muted-foreground">
                      {p.note}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground">{p.market}</td>
                  <td className="py-2 pr-4 text-right font-utility tabular-nums text-foreground">
                    {p.evEbitda === null ? "n/a" : `${p.evEbitda}x`}
                  </td>
                  <td className="py-2 pr-4 text-right font-utility tabular-nums text-foreground">
                    {p.evRevenue === null ? "n/a" : `${p.evRevenue}x`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </InstrumentPanel>

      {/* Assumptions */}
      <InstrumentPanel
        className="bg-muted/50"
        eyebrow="Method notes"
        title={
          <span className="flex items-center gap-2">
            <Info className="size-4" /> Assumptions & sourcing
          </span>
        }
      >
        <div className="space-y-1.5 text-sm text-muted-foreground">
          {result.assumptions.map((a) => (
            <p key={a}>· {a}</p>
          ))}
          <p className="pt-2 text-xs">{peersNote}</p>
        </div>
      </InstrumentPanel>
    </div>
  );
}
