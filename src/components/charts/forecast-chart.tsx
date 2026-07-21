"use client";

import { useId, useMemo, useState } from "react";
import { formatEurCompact } from "@/lib/format";

/** One point on the timeline — historical actuals have no low/high band. */
export interface ForecastSeriesPoint {
  fiscalYear: number;
  value: number | null;
  low?: number | null;
  high?: number | null;
  projected: boolean;
}

export interface ForecastSeries {
  key: string;
  label: string;
  color: string;
  points: ForecastSeriesPoint[];
}

const W = 760;
const H = 320;
const PAD = { top: 20, right: 20, bottom: 40, left: 64 };

/**
 * Actuals + projected outlook on one timeline. The projected span is shaded
 * with a low/high scenario band; the boundary between history and forecast is
 * marked. Direct value labels and a legend keep meaning off color alone.
 */
export function ForecastChart({ series }: { series: ForecastSeries[] }) {
  const gradId = useId();
  const [active, setActive] = useState<number | null>(null);

  const geom = useMemo(() => {
    const years = Array.from(
      new Set(series.flatMap((s) => s.points.map((p) => p.fiscalYear))),
    ).sort((a, b) => a - b);
    const values = series.flatMap((s) =>
      s.points.flatMap((p) =>
        [p.value, p.low, p.high].filter((v): v is number => v != null),
      ),
    );
    const maxY = Math.max(1, ...values);
    const minYear = years[0];
    const maxYear = years[years.length - 1];
    const yearSpan = maxYear - minYear || 1;

    const x = (year: number) =>
      PAD.left + ((year - minYear) / yearSpan) * (W - PAD.left - PAD.right);
    const y = (v: number) =>
      H - PAD.bottom - (v / maxY) * (H - PAD.top - PAD.bottom);

    // Boundary year = last non-projected point across all series.
    const lastActualYear = Math.max(
      minYear,
      ...series.flatMap((s) =>
        s.points.filter((p) => !p.projected).map((p) => p.fiscalYear),
      ),
    );

    return { years, x, y, maxY, minYear, lastActualYear };
  }, [series]);

  const { years, x, y } = geom;

  const linePath = (s: ForecastSeries) =>
    s.points
      .filter((p) => p.value != null)
      .map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.fiscalYear)} ${y(p.value!)}`)
      .join(" ");

  const bandPath = (s: ForecastSeries) => {
    const band = s.points.filter((p) => p.low != null && p.high != null);
    if (band.length === 0) return "";
    const top = band.map((p) => `${x(p.fiscalYear)} ${y(p.high!)}`).join(" L ");
    const bottom = [...band]
      .reverse()
      .map((p) => `${x(p.fiscalYear)} ${y(p.low!)}`)
      .join(" L ");
    return `M ${top} L ${bottom} Z`;
  };

  return (
    <div className="min-w-0">
      <div className="mb-4 flex flex-wrap gap-x-5 gap-y-2">
        {series.map((s) => (
          <div key={s.key} className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: s.color }}
              aria-hidden
            />
            <span className="font-utility text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {s.label}
            </span>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto pb-2">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Financial forecast from ${geom.minYear} to ${years[years.length - 1]}`}
          className="w-full font-utility tabular-nums"
          style={{ minWidth: 560 }}
          onMouseLeave={() => setActive(null)}
        >
          <defs>
            {series.map((s) => (
              <linearGradient
                key={s.key}
                id={`${gradId}-${s.key}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={s.color} stopOpacity={0.22} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>

          {/* horizontal gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((f) => {
            const gy = PAD.top + f * (H - PAD.top - PAD.bottom);
            const val = geom.maxY * (1 - f);
            return (
              <g key={f}>
                <line
                  x1={PAD.left}
                  x2={W - PAD.right}
                  y1={gy}
                  y2={gy}
                  stroke="var(--color-primary)"
                  strokeOpacity={0.1}
                  strokeWidth={1}
                />
                <text
                  x={PAD.left - 8}
                  y={gy + 4}
                  textAnchor="end"
                  fontSize={10.5}
                  className="fill-muted-foreground"
                >
                  {formatEurCompact(val)}
                </text>
              </g>
            );
          })}

          {/* forecast region shading + boundary */}
          <rect
            x={x(geom.lastActualYear)}
            y={PAD.top}
            width={W - PAD.right - x(geom.lastActualYear)}
            height={H - PAD.top - PAD.bottom}
            fill="var(--color-primary)"
            fillOpacity={0.03}
          />
          <line
            x1={x(geom.lastActualYear)}
            x2={x(geom.lastActualYear)}
            y1={PAD.top}
            y2={H - PAD.bottom}
            stroke="var(--color-primary)"
            strokeOpacity={0.3}
            strokeDasharray="4 4"
            strokeWidth={1}
          />
          <text
            x={x(geom.lastActualYear) + 6}
            y={PAD.top + 12}
            fontSize={10}
            fontWeight={600}
            className="fill-muted-foreground uppercase"
            style={{ letterSpacing: "0.08em" }}
          >
            Forecast →
          </text>

          {/* scenario bands (behind lines) */}
          {series.map((s) => (
            <path
              key={`band-${s.key}`}
              d={bandPath(s)}
              fill={`url(#${gradId}-${s.key})`}
              stroke="none"
            />
          ))}

          {/* value lines */}
          {series.map((s) => (
            <path
              key={`line-${s.key}`}
              d={linePath(s)}
              fill="none"
              stroke={s.color}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* markers */}
          {series.map((s) =>
            s.points
              .filter((p) => p.value != null)
              .map((p) => (
                <circle
                  key={`${s.key}-${p.fiscalYear}`}
                  cx={x(p.fiscalYear)}
                  cy={y(p.value!)}
                  r={p.projected ? 3 : 3.5}
                  fill={p.projected ? "var(--background)" : s.color}
                  stroke={s.color}
                  strokeWidth={2}
                />
              )),
          )}

          {/* x-axis year labels + hover columns */}
          {years.map((yr) => (
            <g key={yr}>
              <text
                x={x(yr)}
                y={H - PAD.bottom + 18}
                textAnchor="middle"
                fontSize={11}
                fontWeight={yr === active ? 700 : 400}
                className={
                  yr <= geom.lastActualYear
                    ? "fill-foreground"
                    : "fill-muted-foreground"
                }
              >
                {yr}
              </text>
              <rect
                x={x(yr) - (W - PAD.left - PAD.right) / years.length / 2}
                y={PAD.top}
                width={(W - PAD.left - PAD.right) / years.length}
                height={H - PAD.top - PAD.bottom}
                fill="transparent"
                onMouseEnter={() => setActive(yr)}
              />
            </g>
          ))}

          {/* hover value callouts */}
          {active != null &&
            series.map((s) => {
              const p = s.points.find((pt) => pt.fiscalYear === active);
              if (!p || p.value == null) return null;
              return (
                <g key={`hover-${s.key}`}>
                  <circle
                    cx={x(active)}
                    cy={y(p.value)}
                    r={5}
                    fill={s.color}
                    stroke="var(--background)"
                    strokeWidth={2}
                  />
                  <text
                    x={x(active)}
                    y={y(p.value) - 10}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={700}
                    fill={s.color}
                  >
                    {formatEurCompact(p.value)}
                  </text>
                </g>
              );
            })}
        </svg>
      </div>
    </div>
  );
}
