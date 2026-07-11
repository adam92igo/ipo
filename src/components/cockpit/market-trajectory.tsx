import { Check } from "lucide-react";
import { createElement } from "react";
import type { TrajectoryStage } from "@/lib/cockpit";
import { cn } from "@/lib/utils";

export function MarketTrajectory({ stages }: { stages: TrajectoryStage[] }) {
  return createElement(
    "ol",
    {
      "aria-label": "Route to market",
      className: "grid overflow-hidden bg-primary px-4 py-5 text-primary-foreground sm:grid-cols-5 sm:px-6",
    },
    stages.map((stage, index) =>
      createElement(
        "li",
        {
          key: stage.id,
          className: cn(
            "relative flex min-w-0 items-center gap-3 border-white/15 py-3 sm:block sm:border-l sm:px-4 sm:py-1",
            index === 0 && "sm:border-l-0 sm:pl-0",
          ),
        },
        createElement("span", { className: "sr-only" }, `${stage.label} — ${stage.state}`),
        createElement(
          "span",
          {
            "aria-hidden": true,
            className: cn(
              "grid size-7 shrink-0 place-items-center rounded-full border font-utility text-[0.625rem] font-semibold sm:mb-3",
              stage.state === "completed" && "border-accent bg-accent text-accent-foreground",
              stage.state === "current" && "border-accent bg-white text-primary ring-2 ring-accent/40",
              stage.state === "future" && "border-white/30 text-white/55",
            ),
          },
          stage.state === "completed" ? createElement(Check, { className: "size-3.5" }) : index + 1,
        ),
        createElement(
          "span",
          { "aria-hidden": true, className: "block min-w-0" },
          createElement(
            "span",
            {
              className: cn(
                "block font-utility text-[0.625rem] font-semibold uppercase tracking-[0.14em]",
                stage.state === "current" ? "text-accent" : "text-white/50",
              ),
            },
            stage.state,
          ),
          createElement(
            "span",
            {
              className: cn(
                "mt-0.5 block font-heading text-base font-bold uppercase leading-tight",
                stage.state === "future" ? "text-white/55" : "text-white",
              ),
            },
            stage.label,
          ),
        ),
      ),
    ),
  );
}
