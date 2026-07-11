import { CircleCheck, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * Single-value ring gauge (magnitude → one hue). The strength/weakness status
 * is carried by an icon + label badge, never by color alone.
 */
export function ScoreGauge({
  label,
  score,
  status,
}: {
  label: string;
  /** 0-100 */
  score: number;
  status: "strength" | "weakness" | null;
}) {
  const r = 40;
  const circumference = 2 * Math.PI * r;
  const filled = (score / 100) * circumference;
  const signalColor =
    status === "strength"
      ? "var(--color-positive, var(--color-success))"
      : status === "weakness"
        ? "var(--color-attention, var(--color-destructive))"
        : "var(--color-direction, var(--color-primary))";

  return (
    <div className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 100 100" className="size-28" role="img" aria-label={`${label}: ${score}%`}>
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="var(--color-primary)"
          strokeOpacity={0.12}
          strokeWidth={9}
        />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={signalColor}
          strokeWidth={9}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference - filled}`}
          transform="rotate(-90 50 50)"
        />
        <text
          x="50"
          y="55"
          textAnchor="middle"
          fontSize="20"
          fontWeight="800"
          className="fill-foreground"
        >
          {Math.round(score)}%
        </text>
      </svg>
      <p className="text-sm font-semibold text-primary">{label}</p>
      {status === "strength" && (
        <Badge variant="outline" className="gap-1 text-xs">
          <CircleCheck className="size-3" /> Strength
        </Badge>
      )}
      {status === "weakness" && (
        <Badge variant="outline" className="gap-1 text-xs border-destructive/50 text-destructive">
          <TriangleAlert className="size-3" /> Weakness
        </Badge>
      )}
    </div>
  );
}
