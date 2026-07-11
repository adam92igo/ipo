import { createElement } from "react";

export function SnapshotState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return createElement(
    "div",
    { className: "border-l-2 border-accent py-1 pl-4" },
    createElement(
      "p",
      { className: "font-heading text-lg font-bold uppercase tracking-wide text-primary" },
      title,
    ),
    createElement(
      "p",
      { className: "mt-1 max-w-md text-sm leading-relaxed text-muted-foreground" },
      description,
    ),
    createElement("div", { className: "mt-3" }, action),
  );
}
