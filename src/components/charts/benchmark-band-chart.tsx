import type { BenchmarkMetric } from "@/engines/benchmark";

/**
 * One row per metric: a low–high reference band with a mid tick and, when
 * derivable, a marker showing where the company sits. Position is stated in
 * text (below/within/above) so meaning never rests on colour alone.
 */
const W = 640;
const ROW_H = 52;
const LABEL_W = 190;
const PAD_R = 64;

const POSITION_COLOR: Record<string, string> = {
  below: "var(--color-chart-4)",
  within: "var(--color-chart-3)",
  above: "var(--color-chart-2)",
};

const fmt = (v: number, unit: BenchmarkMetric["unit"]) =>
  unit === "x" ? `${v}x` : unit === "%" ? `${v}%` : `${v}`;

export function BenchmarkBandChart({ metrics }: { metrics: BenchmarkMetric[] }) {
  const height = metrics.length * ROW_H + 8;

  return (
    <div className="min-w-0 overflow-x-auto pb-2">
      <svg
        viewBox={`0 0 ${W} ${height}`}
        role="img"
        aria-label="Company metrics versus sector reference bands"
        className="w-full font-utility tabular-nums"
        style={{ minWidth: 520 }}
      >
        {metrics.map((m, i) => {
          const cy = i * ROW_H + ROW_H / 2;
          // Scale spans the reference band with 25% headroom each side so an
          // out-of-band company marker stays visible.
          const pad = (m.reference.high - m.reference.low) * 0.25 || 1;
          const min = m.reference.low - pad;
          const max = m.reference.high + pad;
          const span = max - min || 1;
          const x = (v: number) =>
            LABEL_W + ((v - min) / span) * (W - LABEL_W - PAD_R);
          const clampX = (v: number) =>
            Math.max(LABEL_W, Math.min(W - PAD_R, x(v)));

          return (
            <g key={m.key}>
              {/* metric label */}
              <text x={0} y={cy - 4} fontSize={12.5} className="fill-foreground">
                {m.label}
              </text>
              <text
                x={0}
                y={cy + 12}
                fontSize={10.5}
                className="fill-muted-foreground"
              >
                {m.value === null
                  ? "n/a"
                  : `${fmt(m.value, m.unit)} · ${
                      m.position === "within"
                        ? "in range"
                        : m.position === "above"
                          ? "above range"
                          : "below range"
                    }`}
              </text>

              {/* track */}
              <line
                x1={LABEL_W}
                x2={W - PAD_R}
                y1={cy}
                y2={cy}
                stroke="var(--color-primary)"
                strokeOpacity={0.12}
                strokeWidth={1}
              />
              {/* reference band */}
              <line
                x1={x(m.reference.low)}
                x2={x(m.reference.high)}
                y1={cy}
                y2={cy}
                stroke="var(--color-chart-5)"
                strokeWidth={7}
                strokeLinecap="round"
                opacity={0.5}
              >
                <title>
                  {`Sector band: ${fmt(m.reference.low, m.unit)} – ${fmt(m.reference.high, m.unit)}`}
                </title>
              </line>
              {/* band mid tick */}
              <line
                x1={x(m.reference.mid)}
                x2={x(m.reference.mid)}
                y1={cy - 6}
                y2={cy + 6}
                stroke="var(--color-primary)"
                strokeOpacity={0.4}
                strokeWidth={1.5}
              />
              {/* band endpoint labels */}
              <text
                x={x(m.reference.low)}
                y={cy + 20}
                textAnchor="middle"
                fontSize={9.5}
                className="fill-muted-foreground"
              >
                {fmt(m.reference.low, m.unit)}
              </text>
              <text
                x={x(m.reference.high)}
                y={cy + 20}
                textAnchor="middle"
                fontSize={9.5}
                className="fill-muted-foreground"
              >
                {fmt(m.reference.high, m.unit)}
              </text>

              {/* company marker */}
              {m.value !== null && m.position !== null && (
                <g>
                  <circle
                    cx={clampX(m.value)}
                    cy={cy}
                    r={6}
                    fill={POSITION_COLOR[m.position]}
                    stroke="var(--background)"
                    strokeWidth={2}
                  >
                    <title>{`Company: ${fmt(m.value, m.unit)}`}</title>
                  </circle>
                  <text
                    x={clampX(m.value)}
                    y={cy - 12}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={700}
                    fill={POSITION_COLOR[m.position]}
                  >
                    {fmt(m.value, m.unit)}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
