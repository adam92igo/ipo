import { Info } from "lucide-react";
import { MetricScale } from "@/components/cockpit/metric-scale";
import { ValuationRangeChart } from "@/components/charts/valuation-range-chart";
import { InstrumentPanel } from "@/components/layout/instrument-panel";
import { PageHeading } from "@/components/layout/page-heading";
import { equityRangeOf, type MethodResult } from "@/engines/valuation";
import { listFinancialsFor } from "@/lib/data-access/financials";
import { getCompany } from "@/lib/data-access/companies";
import { orNotFound, requireOrgPageContext } from "@/lib/data-access/page-context";
import {
  getLatestValuationRunFor,
  type ValuationRunResults,
} from "@/lib/data-access/valuations";
import { formatEurCompact } from "@/lib/format";
import { getValuationRefs } from "@/lib/valuation-refs";
import { FinancialsManager } from "./financials-manager";
import { RunValuationButton } from "./run-valuation-button";

export const metadata = { title: "Valuation" };

const METHOD_LABELS: Record<string, string> = {
  dcf: "Discounted cash flows",
  comparables: "Sector comparables (EV/EBITDA)",
  market_multiples: "Market multiples (EV/Revenue)",
};

const methodRange = (m: MethodResult) => equityRangeOf(m);

export default async function ValuationPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const ctx = await requireOrgPageContext();

  const company = await orNotFound(() => getCompany(ctx, companyId));
  const [financials, latestRun] = await Promise.all([
    listFinancialsFor(ctx, company),
    getLatestValuationRunFor(ctx, company),
  ]);

  const results = latestRun ? (latestRun.results as ValuationRunResults) : null;
  const canWrite = ctx.role === "owner" || ctx.role === "admin";
  const financialHistory = (
    <InstrumentPanel eyebrow="Source data" title="Financial history">
      <p className="mb-5 max-w-3xl text-sm text-muted-foreground">
        One row per fiscal year, from the annual accounts. The valuation uses the
        latest year and the revenue trend.
      </p>
      <FinancialsManager
        companyId={company.id}
        financials={financials}
        canWrite={canWrite}
      />
    </InstrumentPanel>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeading
        eyebrow="Valuation instrument"
        title={company.name}
        description="Indicative equity value from three deterministic methods — not investment advice."
        actions={
          <RunValuationButton
            companyId={company.id}
            hasFinancials={financials.length > 0}
            hasExistingRun={latestRun !== null}
          />
        }
      />

      {!results && financialHistory}

      {results && latestRun && (
        <>
          <section aria-label="Indicative equity range">
            <InstrumentPanel className="p-0">
              <div className="grid lg:grid-cols-[0.85fr_1.4fr]">
                <div className="flex min-h-72 items-center border-b border-border p-6 lg:border-b-0 lg:border-r">
                  <div className="w-full">
                    <p className="instrument-label">Estimated equity value</p>
                    <p className="mt-4 font-heading text-4xl font-extrabold leading-none text-primary sm:text-5xl">
                      <span className="font-utility tabular-nums">
                        {formatEurCompact(results.aggregated.low)}
                      </span>
                      <span className="mx-2 text-2xl text-muted-foreground">–</span>
                      <span className="font-utility tabular-nums">
                        {formatEurCompact(results.aggregated.high)}
                      </span>
                    </p>
                    <div className="mt-7 [&_dd]:font-utility [&_dd]:tabular-nums">
                      <MetricScale
                        low={results.aggregated.low}
                        mid={results.aggregated.mid}
                        high={results.aggregated.high}
                      />
                    </div>
                    <p className="mt-5 border-t border-border pt-4 font-utility text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
                      {results.sectorLabel} · refs {latestRun.refsVersion}
                    </p>
                  </div>
                </div>
                <div className="p-6">
                  <p className="instrument-label">Method bands</p>
                  <h2 className="mt-1 font-heading text-xl font-extrabold uppercase tracking-wide text-primary">
                    Range by method
                  </h2>
                  <div className="mt-5">
                    <ValuationRangeChart
                      rows={[
                        ...results.methods.map((m) => ({
                          label: METHOD_LABELS[m.method] ?? m.method,
                          ...methodRange(m),
                        })),
                        {
                          label: "Aggregated range",
                          low: results.aggregated.low,
                          mid: results.aggregated.mid,
                          high: results.aggregated.high,
                          emphasis: true,
                        },
                      ]}
                    />
                  </div>
                </div>
              </div>
            </InstrumentPanel>
          </section>

          {financialHistory}

          <div className="grid gap-6 md:grid-cols-3">
            {results.methods.map((method) => {
              const range = methodRange(method);
              return (
                <InstrumentPanel
                  key={method.method}
                  eyebrow="Valuation method"
                  title={METHOD_LABELS[method.method] ?? method.method}
                >
                  <p className="font-utility text-sm font-semibold tabular-nums text-primary">
                    {range.low === range.high
                      ? formatEurCompact(range.mid)
                      : `${formatEurCompact(range.low)} – ${formatEurCompact(range.high)}`}
                  </p>
                  <ul className="mt-4 space-y-1.5 border-t border-border pt-4 text-xs text-muted-foreground">
                    {method.assumptions.map((assumption) => (
                      <li key={assumption} className="flex gap-1.5">
                        <span aria-hidden>·</span>
                        {assumption}
                      </li>
                    ))}
                  </ul>
                </InstrumentPanel>
              );
            })}
          </div>

          <InstrumentPanel
            className="bg-muted/50"
            eyebrow="Method notes"
            title={
              <span className="flex items-center gap-2">
                <Info className="size-4" /> Assumptions & skipped methods
              </span>
            }
          >
            <div className="space-y-1.5 text-sm text-muted-foreground">
              {results.assumptions.map((assumption) => (
                <p key={assumption}>· {assumption}</p>
              ))}
              {results.aggregated.methodsSkipped.map((skipped) => (
                <p key={skipped.method}>
                  · {METHOD_LABELS[skipped.method] ?? skipped.method} skipped —{" "}
                  {skipped.reason}
                </p>
              ))}
              <p className="pt-2 text-xs">
                {getValuationRefs(latestRun.refsVersion).note}
              </p>
            </div>
          </InstrumentPanel>
        </>
      )}
    </div>
  );
}
