import { createElement } from "react";

export function ValuationEvidenceCoverage({
  methodCount,
  skippedMethodCount,
  financialYearCount,
  refsVersion,
}: {
  methodCount: number;
  skippedMethodCount: number;
  financialYearCount: number;
  refsVersion: string;
}) {
  const metric = (label: string, value: React.ReactNode, className?: string) =>
    createElement(
      "div",
      { className },
      createElement("dt", { className: "instrument-label" }, label),
      createElement(
        "dd",
        { className: "mt-1 font-heading text-3xl font-extrabold text-primary" },
        value,
      ),
    );

  return createElement(
    "dl",
    { className: "grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3" },
    metric("Methods in range", methodCount),
    metric("Methods skipped", skippedMethodCount),
    metric(
      "Financial history",
      `${financialYearCount} ${financialYearCount === 1 ? "year" : "years"}`,
      "col-span-2 sm:col-span-1",
    ),
    createElement(
      "div",
      { className: "col-span-2 border-t pt-3 sm:col-span-3" },
      createElement("dt", { className: "instrument-label" }, "Reference set"),
      createElement(
        "dd",
        { className: "mt-1 font-utility text-xs font-semibold text-primary" },
        refsVersion,
      ),
    ),
  );
}
