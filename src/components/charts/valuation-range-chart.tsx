import { formatEurCompact } from "@/lib/format";
import { VALUATION_RANGE_CHART_LAYOUT } from "./valuation-range-chart-layout";

/**
 * One row per valuation method (low—high segment with a mid marker) plus an
 * emphasized aggregated row. Navy, gold and steel establish hierarchy; labels
 * and direct values ensure color never carries meaning alone.
 */
interface RangeRow {
  label: string;
  low: number;
  mid: number;
  high: number;
  emphasis?: boolean;
}

const {
  width: WIDTH,
  rowHeight: ROW_H,
  labelWidth: LABEL_W,
  padRight: PAD_R,
} = VALUATION_RANGE_CHART_LAYOUT;

export function ValuationRangeChart({ rows }: { rows: RangeRow[] }) {
  const min = Math.min(...rows.map((r) => r.low));
  const max = Math.max(...rows.map((r) => r.high));
  const span = max - min || 1;
  const x = (v: number) =>
    LABEL_W + ((v - min) / span) * (WIDTH - LABEL_W - PAD_R);
  const height = rows.length * ROW_H + 12;

  return (
    <div className="overflow-x-auto pb-2">
      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        role="img"
        aria-label={`Valuation ranges: ${rows
          .map((r) => `${r.label} ${formatEurCompact(r.low)} to ${formatEurCompact(r.high)}`)
          .join(", ")}`}
        className="w-full font-utility tabular-nums"
        style={{ minWidth: `${VALUATION_RANGE_CHART_LAYOUT.minCssWidth}px` }}
      >
        {rows.map((row, i) => {
          const cy = i * ROW_H + ROW_H / 2 + 6;
          const strokeWidth = row.emphasis ? 10 : 6;
          return (
            <g key={row.label}>
              <text
                x={0}
                y={cy + 4}
                fontSize={12.5}
                fontWeight={row.emphasis ? 700 : 400}
                className={row.emphasis ? "fill-foreground" : "fill-muted-foreground"}
              >
                {row.label}
              </text>
              {/* Recessive full-width track */}
              <line
                x1={LABEL_W}
                x2={WIDTH - PAD_R}
                y1={cy}
                y2={cy}
                stroke="var(--color-primary)"
                strokeOpacity={0.14}
                strokeWidth={1}
              />
              {/* low—high segment */}
              <line
                x1={x(row.low)}
                x2={x(row.high)}
                y1={cy}
                y2={cy}
                stroke={row.emphasis ? "var(--color-primary)" : "var(--color-chart-5)"}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                opacity={row.emphasis ? 1 : 0.55}
              >
                <title>{`${row.label}: ${formatEurCompact(row.low)} – ${formatEurCompact(row.high)}`}</title>
              </line>
              {/* mid marker with surface ring */}
              <circle
                cx={x(row.mid)}
                cy={cy}
                r={row.emphasis ? 6 : 4.5}
                fill={row.emphasis ? "var(--color-accent)" : "var(--color-primary)"}
                stroke="var(--background)"
                strokeWidth={2}
              >
                <title>{`Mid: ${formatEurCompact(row.mid)}`}</title>
              </circle>
              {/* Direct value labels (text tokens) */}
              <text
                x={x(row.low) - 6}
                y={cy - 10}
                textAnchor="end"
                fontSize={11.5}
                className="fill-muted-foreground"
              >
                {formatEurCompact(row.low)}
              </text>
              <text
                x={x(row.high) + 6}
                y={cy - 10}
                fontSize={11.5}
                fontWeight={row.emphasis ? 700 : 400}
                className={row.emphasis ? "fill-foreground" : "fill-muted-foreground"}
              >
                {formatEurCompact(row.high)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
