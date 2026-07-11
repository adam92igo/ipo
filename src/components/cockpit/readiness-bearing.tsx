import { createElement } from "react";

export function ReadinessBearing({
  score,
  label,
  delta,
}: {
  score: number;
  label: string;
  delta?: number | null;
}) {
  const roundedScore = Math.round(score);
  const boundedScore = Math.max(0, Math.min(100, score));

  return createElement(
    "div",
    {
      className: "flex items-center gap-5",
      role: "group",
      "aria-label": `IPO readiness: ${roundedScore}%, ${label}`,
    },
    createElement(
      "div",
      {
        "aria-hidden": true,
        className: "relative grid size-32 shrink-0 place-items-center rounded-full",
        style: {
          background: `conic-gradient(var(--accent) ${boundedScore * 3.6}deg, var(--muted) 0deg)`,
        },
      },
      createElement(
        "div",
        { className: "grid size-[6.5rem] place-items-center rounded-full bg-card ring-1 ring-border" },
        createElement(
          "span",
          { className: "font-heading text-5xl font-extrabold leading-none text-primary" },
          roundedScore,
          createElement("span", { className: "text-2xl" }, "%"),
        ),
      ),
    ),
    createElement(
      "div",
      { className: "min-w-0" },
      createElement("p", { className: "instrument-label" }, "Current position"),
      createElement(
        "p",
        { className: "mt-1 font-heading text-2xl font-extrabold uppercase leading-none text-primary" },
        label,
      ),
      delta !== undefined && delta !== null
        ? createElement(
            "p",
            { className: "mt-2 font-utility text-xs font-semibold text-muted-foreground" },
            `${delta > 0 ? "+" : ""}${delta} points from prior assessment`,
          )
        : null,
    ),
  );
}
