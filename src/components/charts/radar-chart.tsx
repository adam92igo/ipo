/**
 * Single-series pentagon radar, pure SVG (no chart lib).
 * Direction marks use the cockpit's semantic chart token; the grid stays
 * recessive and every vertex carries a visible value label, so identity never
 * relies on color.
 */
interface RadarDatum {
  label: string;
  /** 0-100 */
  score: number;
}

const WIDTH = 460;
const HEIGHT = 340;
const CX = WIDTH / 2;
const CY = HEIGHT / 2 + 10;
const R = 112;
const RINGS = [25, 50, 75, 100];

function polar(angleDeg: number, radius: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [CX + radius * Math.cos(rad), CY + radius * Math.sin(rad)];
}

function polygonPoints(values: number[]): string {
  return values
    .map((v, i) => {
      const angle = -90 + (360 / values.length) * i;
      const [x, y] = polar(angle, (v / 100) * R);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function RadarChart({ data }: { data: RadarDatum[] }) {
  const n = data.length;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={`Readiness radar: ${data.map((d) => `${d.label} ${d.score}%`).join(", ")}`}
      className="w-full max-w-[420px]"
    >
      {/* Recessive grid: rings + spokes */}
      {RINGS.map((ring) => (
        <polygon
          key={ring}
          points={polygonPoints(Array(n).fill(ring))}
          fill="none"
          stroke="var(--color-primary)"
          strokeOpacity={0.14}
          strokeWidth={1}
        />
      ))}
      {data.map((_, i) => {
        const [x, y] = polar(-90 + (360 / n) * i, R);
        return (
          <line
            key={i}
            x1={CX}
            y1={CY}
            x2={x}
            y2={y}
            stroke="var(--color-primary)"
            strokeOpacity={0.14}
            strokeWidth={1}
          />
        );
      })}

      {/* Data polygon */}
      <polygon
        points={polygonPoints(data.map((d) => d.score))}
        fill="var(--color-direction, var(--color-primary))"
        fillOpacity={0.16}
        stroke="var(--color-direction, var(--color-primary))"
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* Vertices with a 2px surface ring + hover tooltip */}
      {data.map((d, i) => {
        const angle = -90 + (360 / n) * i;
        const [x, y] = polar(angle, (d.score / 100) * R);
        return (
          <circle
            key={d.label}
            cx={x}
            cy={y}
            r={4.5}
            fill="var(--color-direction, var(--color-primary))"
            stroke="var(--background)"
            strokeWidth={2}
          >
            <title>{`${d.label}: ${d.score}%`}</title>
          </circle>
        );
      })}

      {/* Category + value labels (text tokens, never the series color) */}
      {data.map((d, i) => {
        const angle = -90 + (360 / n) * i;
        const [x, y] = polar(angle, R + 26);
        const anchor =
          Math.abs(Math.cos((angle * Math.PI) / 180)) < 0.3
            ? "middle"
            : Math.cos((angle * Math.PI) / 180) > 0
              ? "start"
              : "end";
        return (
          <g key={d.label} textAnchor={anchor}>
            <text x={x} y={y - 4} className="fill-muted-foreground" fontSize={12}>
              {d.label}
            </text>
            <text x={x} y={y + 12} className="fill-foreground" fontSize={13} fontWeight={700}>
              {d.score}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}
