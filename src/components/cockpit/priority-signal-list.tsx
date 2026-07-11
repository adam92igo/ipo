import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { createElement } from "react";
import type { CockpitPriority } from "@/lib/data-access/cockpit";
import { cn } from "@/lib/utils";

export function PrioritySignalList({
  companyId,
  items,
}: {
  companyId: string;
  items: CockpitPriority[];
}) {
  return createElement(
    "ol",
    { "aria-label": "Priority signals", className: "divide-y divide-border border-y" },
    items.map((item, index) => {
      const href =
        item.source === "roadmap"
          ? `/companies/${companyId}/roadmap`
          : `/companies/${companyId}/results`;
      return createElement(
        "li",
        { key: `${item.source}-${item.id}` },
        createElement(
          Link,
          {
            href,
            className:
              "group grid grid-cols-[2rem_1fr_auto] items-center gap-3 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          },
          createElement(
            "span",
            {
              className: cn(
                "grid size-7 place-items-center border font-utility text-[0.625rem] font-semibold",
                item.priority === "critical"
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : "border-accent/50 bg-accent/10 text-primary",
              ),
            },
            String(index + 1).padStart(2, "0"),
          ),
          createElement(
            "span",
            { className: "min-w-0" },
            createElement(
              "span",
              { className: "block truncate text-sm font-semibold text-primary" },
              item.title,
            ),
            createElement(
              "span",
              {
                className:
                  "mt-0.5 block font-utility text-[0.625rem] font-semibold uppercase tracking-wider text-muted-foreground",
              },
              `${item.category} · ${item.priority}${item.estimatedWeeks !== null ? ` · ${item.estimatedWeeks} weeks` : ""}`,
            ),
          ),
          createElement(ArrowUpRight, {
            className: "size-4 text-muted-foreground transition-colors group-hover:text-primary",
          }),
        ),
      );
    }),
  );
}
