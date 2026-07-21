import { Info, TrendingUp } from "lucide-react";
import Link from "next/link";
import {
  ForecastChart,
  type ForecastSeries,
} from "@/components/charts/forecast-chart";
import { InstrumentPanel } from "@/components/layout/instrument-panel";
import { PageHeading } from "@/components/layout/page-heading";
import { Button } from "@/components/ui/button";
import type { MetricForecast } from "@/engines/forecast";
import { getCompanyForecast } from "@/lib/data-access/forecast";
import { orNotFound, requireOrgPageContext } from "@/lib/data-access/page-context";
import { getForecastSettingsFile } from "@/lib/forecast-settings";
import { formatEur, formatEurCompact } from "@/lib/format";

export const metadata = { title: "Forecast" };

const SERIES_COLORS: Record<MetricForecast["metric"], string> = {
  revenue: "var(--color-chart-1)",
  ebitda: "var(--color-chart-2)",
  freeCashFlow: "var(--color-chart-3)",
};

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

/** Builds one chart series (history actuals + projected band) for a metric. */
function toSeries(
  metric: MetricForecast,
  financials: { fiscalYear: number; value: number | null }[],
): ForecastSeries {
  const history = financials
    .filter((f) => f.value != null && f.fiscalYear <= metric.anchorYear)
    .map((f) => ({
      fiscalYear: f.fiscalYear,
      value: f.value,
      projected: false,
    }));
  const projected = metric.points.map((p) => ({
    fiscalYear: p.fiscalYear,
    value: p.base,
    low: p.low,
    high: p.high,
    projected: true,
  }));
  return {
    key: metric.metric,
    label: metric.label,
    color: SERIES_COLORS[metric.metric],
    points: [...history, ...projected],
  };
}

export default async function ForecastPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const ctx = await requireOrgPageContext();
  const { company, financials, result, unavailableReason, settingsVersion } =
    await orNotFound(() => getCompanyForecast(ctx, companyId));

  const settingsNote = getForecastSettingsFile(settingsVersion).note;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeading
        eyebrow="Forecast instrument"
        title={company.name}
        description="Deterministic multi-year outlook for revenue, EBITDA and free cash flow — an indicative projection, not a guarantee and not investment advice."
        metadata={
          result && (
            <span className="rounded-full border border-border bg-muted/50 px-3 py-1 font-utility text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
              {result.horizonYears}-year horizon · settings {settingsVersion}
            </span>
          )
        }
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href={`/companies/${company.id}/benchmark`}>
              Compare to sector
            </Link>
          </Button>
        }
      />

      {!result && (
        <InstrumentPanel eyebrow="No forecast yet" title="Add financial history">
          <p className="max-w-2xl text-sm text-muted-foreground">
            A projection needs at least one fiscal year with a positive revenue,
            EBITDA or free-cash-flow figure ({unavailableReason}). Add the annual
            accounts on the valuation page, then return here.
          </p>
          <Link
            href={`/companies/${company.id}/valuation`}
            className="mt-5 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 font-utility text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Add financial history
          </Link>
        </InstrumentPanel>
      )}

      {result && (
        <>
          {/* KPI cards: base growth + latest→final base value per metric */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InstrumentPanel eyebrow="Base growth" title="">
              <p className="font-heading text-3xl font-extrabold leading-none text-primary">
                <span className="font-utility tabular-nums">
                  {pct(result.baseGrowth)}
                </span>
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                {result.historicalCagr === null
                  ? "Flat at terminal rate (one revenue year)"
                  : `From historical revenue CAGR of ${pct(result.historicalCagr)}, decaying over the horizon`}
              </p>
            </InstrumentPanel>

            {result.metrics.map((metric) => {
              const last = metric.points[metric.points.length - 1];
              const change = metric.anchorValue
                ? last.base / metric.anchorValue - 1
                : 0;
              return (
                <InstrumentPanel
                  key={metric.metric}
                  eyebrow={`${metric.label} · ${last.fiscalYear}`}
                  title=""
                >
                  <p className="font-heading text-2xl font-extrabold leading-none text-primary">
                    <span className="font-utility tabular-nums">
                      {formatEurCompact(last.base)}
                    </span>
                  </p>
                  <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                    <TrendingUp className="size-3.5" aria-hidden />
                    {change >= 0 ? "+" : ""}
                    {pct(change)} vs {metric.anchorYear} (
                    {formatEurCompact(metric.anchorValue)})
                  </p>
                </InstrumentPanel>
              );
            })}
          </div>

          {/* Main chart */}
          <InstrumentPanel eyebrow="Projected trajectory" title="Actuals → forecast">
            <p className="mb-5 max-w-3xl text-sm text-muted-foreground">
              Solid points are reported actuals; hollow points are projected. The
              shaded band around each projected line is the optimistic /
              pessimistic scenario range.
            </p>
            <ForecastChart
              series={result.metrics.map((metric) =>
                toSeries(
                  metric,
                  financials.map((f) => ({
                    fiscalYear: f.fiscalYear,
                    value: f[metric.metric],
                  })),
                ),
              )}
            />
          </InstrumentPanel>

          {/* Projection table */}
          <InstrumentPanel eyebrow="Year by year" title="Projected figures">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left font-utility text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-4">Metric</th>
                    {result.metrics[0].points.map((p) => (
                      <th key={p.fiscalYear} className="py-2 pr-4 text-right">
                        {p.fiscalYear}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="font-utility tabular-nums">
                  {result.metrics.map((metric) => (
                    <tr
                      key={metric.metric}
                      className="border-b border-border/60 last:border-0"
                    >
                      <td className="py-2.5 pr-4 font-sans font-medium text-foreground">
                        {metric.label}
                      </td>
                      {metric.points.map((p) => (
                        <td
                          key={p.fiscalYear}
                          className="py-2.5 pr-4 text-right text-foreground"
                        >
                          <span title={formatEur(p.base)}>
                            {formatEurCompact(p.base)}
                          </span>
                          <span className="block text-[0.6875rem] text-muted-foreground">
                            {formatEurCompact(p.low)} – {formatEurCompact(p.high)}
                          </span>
                        </td>
                      ))}
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
                <Info className="size-4" /> Assumptions & scope
              </span>
            }
          >
            <div className="space-y-1.5 text-sm text-muted-foreground">
              {result.assumptions.map((a) => (
                <p key={a}>· {a}</p>
              ))}
              {result.metrics.flatMap((m) =>
                m.assumptions.map((a) => <p key={`${m.metric}-${a}`}>· {a}</p>),
              )}
              {result.skipped.map((s) => (
                <p key={s.metric}>
                  · {s.metric} not projected — {s.reason}
                </p>
              ))}
              <p className="pt-2 text-xs">{settingsNote}</p>
            </div>
          </InstrumentPanel>
        </>
      )}
    </div>
  );
}
