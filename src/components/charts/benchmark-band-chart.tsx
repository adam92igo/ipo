import type { BenchmarkMetric } from "@/engines/benchmark";

const W = 640;
const ROW_H = 58;
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
  const height = metrics.length * ROW_H + 34;

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
          const measured = m.value !== null && m.position !== null;
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
              <text x={0} y={cy - 4} fontSize={12.5} className="fill-foreground">
                {m.label}
              </text>
              <text
                x={0}
                y={cy + 12}
                fontSize={10.5}
                className={measured ? "fill-foreground" : "fill-muted-foreground"}
              >
                {measured
                  ? `${fmt(m.value as number, m.unit)} · ${
                      m.position === "within"
                        ? "in range"
                        : m.position === "above"
                          ? "above range"
                          : "below range"
                    }`
                  : "sector band only"}
              </text>

              <line
                x1={LABEL_W}
                x2={W - PAD_R}
                y1={cy}
                y2={cy}
                stroke="var(--color-primary)"
                strokeOpacity={0.1}
                strokeWidth={1}
              />
              <line
                x1={x(m.reference.low)}
                x2={x(m.reference.high)}
                y1={cy}
                y2={cy}
                stroke="var(--color-chart-5)"
                strokeWidth={7}
                strokeLinecap="round"
                opacity={measured ? 0.55 : 0.28}
              >
                <title>
                  {`Sector band: ${fmt(m.reference.low, m.unit)} – ${fmt(m.reference.high, m.unit)}`}
                </title>
              </line>

              <path
                d={`M ${x(m.reference.mid)} ${cy + 9} l 3 3 l -3 3 l -3 -3 z`}
                fill="var(--color-primary)"
                opacity={0.35}
              >
                <title>{`Sector median: ${fmt(m.reference.mid, m.unit)}`}</title>
              </path>

              <text
                x={x(m.reference.low)}
                y={cy + 24}
                textAnchor="middle"
                fontSize={9.5}
                className="fill-muted-foreground"
              >
                {fmt(m.reference.low, m.unit)}
              </text>
              <text
                x={x(m.reference.high)}
                y={cy + 24}
                textAnchor="middle"
                fontSize={9.5}
                className="fill-muted-foreground"
              >
                {fmt(m.reference.high, m.unit)}
              </text>

              {measured && (
                <g>
                  <circle
                    cx={clampX(m.value as number)}
                    cy={cy}
                    r={6.5}
                    fill={POSITION_COLOR[m.position as string]}
                    stroke="var(--background)"
                    strokeWidth={2.5}
                  >
                    <title>{`Company: ${fmt(m.value as number, m.unit)}`}</title>
                  </circle>
                  <text
                    x={clampX(m.value as number)}
                    y={cy - 12}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={700}
                    fill={POSITION_COLOR[m.position as string]}
                  >
                    {fmt(m.value as number, m.unit)}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        <g transform={`translate(${LABEL_W}, ${height - 8})`}>
          <circle cx={4} cy={-3} r={5} fill="var(--color-chart-3)" stroke="var(--background)" strokeWidth={2} />
          <text x={16} y={0} fontSize={10} className="fill-muted-foreground">This company</text>
          <path d="M 128 -6 l 3 3 l -3 3 l -3 -3 z" fill="var(--color-primary)" opacity={0.35} />
          <text x={140} y={0} fontSize={10} className="fill-muted-foreground">Sector median</text>
          <line x1={244} x2={264} y1={-3} y2={-3} stroke="var(--color-chart-5)" strokeWidth={7} strokeLinecap="round" opacity={0.55} />
          <text x={272} y={0} fontSize={10} className="fill-muted-foreground">Sector range</text>
        </g>
      </svg>
    </div>
  );
}
