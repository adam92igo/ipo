import { createElement } from "react";
import { formatEurCompact } from "@/lib/format";

export function MetricScale({ low, mid, high }: { low: number; mid: number; high: number }) {
  const midpointPosition =
    high === low ? 50 : Math.max(0, Math.min(100, ((mid - low) / (high - low)) * 100));
  const value = (label: string, amount: number, alignment: string, emphasis = false) =>
    createElement(
      "div",
      { className: alignment },
      createElement("dt", { className: "instrument-label" }, label),
      createElement(
        "dd",
        {
          className: `mt-1 font-heading ${emphasis ? "text-xl font-extrabold" : "text-lg font-bold"} text-primary`,
        },
        formatEurCompact(amount),
      ),
    );

  return createElement(
    "div",
    {
      role: "group",
      "aria-label": `Valuation range: ${formatEurCompact(low)} to ${formatEurCompact(high)}`,
    },
    createElement(
      "div",
      { className: "relative mb-3 h-3 bg-muted", "aria-hidden": true },
      createElement("div", { className: "absolute inset-y-0 left-0 right-0 bg-primary/20" }),
      createElement("div", {
        className:
          "absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rotate-45 border-2 border-card bg-accent shadow-sm",
        style: { left: `${midpointPosition}%` },
      }),
    ),
    createElement(
      "dl",
      { className: "grid grid-cols-3 gap-3" },
      value("Low", low, ""),
      value("Midpoint", mid, "text-center", true),
      value("High", high, "text-right"),
    ),
  );
}
