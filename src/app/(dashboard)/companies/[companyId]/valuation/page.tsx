import { Info } from "lucide-react";
import { notFound } from "next/navigation";
import { ValuationRangeChart } from "@/components/charts/valuation-range-chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { MethodResult } from "@/engines/valuation";
import { NotFoundError } from "@/lib/data-access/errors";
import { listFinancials } from "@/lib/data-access/financials";
import { getCompany } from "@/lib/data-access/companies";
import { requireOrgPageContext } from "@/lib/data-access/page-context";
import {
  getLatestValuationRun,
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

function methodRange(m: MethodResult) {
  return m.method === "dcf"
    ? { low: m.equityValue, mid: m.equityValue, high: m.equityValue }
    : m.equity;
}

export default async function ValuationPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const ctx = await requireOrgPageContext();

  let company, financials, latestRun;
  try {
    company = await getCompany(ctx, companyId);
    [financials, latestRun] = await Promise.all([
      listFinancials(ctx, companyId),
      getLatestValuationRun(ctx, companyId),
    ]);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const results = latestRun ? (latestRun.results as ValuationRunResults) : null;
  const canWrite = ctx.role === "owner" || ctx.role === "admin";

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm uppercase italic tracking-wider text-secondary">
            /Valuation/
          </p>
          <h1 className="text-3xl font-extrabold text-primary">{company.name}</h1>
          <p className="text-muted-foreground">
            Indicative equity value from three deterministic methods — not
            investment advice.
          </p>
        </div>
        <RunValuationButton
          companyId={company.id}
          hasFinancials={financials.length > 0}
          hasExistingRun={latestRun !== null}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-primary">Financial history</CardTitle>
          <CardDescription>
            One row per fiscal year, from the annual accounts. The valuation uses
            the latest year and the revenue trend.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FinancialsManager
            companyId={company.id}
            financials={financials}
            canWrite={canWrite}
          />
        </CardContent>
      </Card>

      {results && latestRun && (
        <>
          <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
            <Card className="flex flex-col justify-center">
              <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                <p className="text-sm uppercase italic tracking-wider text-secondary">
                  /Estimated equity value/
                </p>
                <p className="text-4xl font-extrabold text-primary">
                  {formatEurCompact(results.aggregated.low)}
                  <span className="mx-2 text-2xl text-muted-foreground">–</span>
                  {formatEurCompact(results.aggregated.high)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Midpoint {formatEurCompact(results.aggregated.mid)} ·{" "}
                  {results.sectorLabel} · refs {latestRun.refsVersion}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-primary">Range by method</CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {results.methods.map((method) => {
              const range = methodRange(method);
              return (
                <Card key={method.method}>
                  <CardHeader>
                    <CardTitle className="text-base text-primary">
                      {METHOD_LABELS[method.method] ?? method.method}
                    </CardTitle>
                    <CardDescription>
                      {range.low === range.high
                        ? formatEurCompact(range.mid)
                        : `${formatEurCompact(range.low)} – ${formatEurCompact(range.high)}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1.5 text-xs text-muted-foreground">
                      {method.assumptions.map((assumption) => (
                        <li key={assumption} className="flex gap-1.5">
                          <span aria-hidden>·</span>
                          {assumption}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-primary">
                <Info className="size-4" /> Assumptions & skipped methods
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm text-muted-foreground">
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
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
