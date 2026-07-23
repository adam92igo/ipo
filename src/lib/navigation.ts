import type { Persona } from "./dashboard-persona";

export type DashboardNavLabel =
  | "Overview"
  | "Diagnostic"
  | "Valuation"
  | "Forecast"
  | "Benchmark"
  | "Market"
  | "Roadmap"
  | "Assistant";

const PERSONA_NAV_LABELS: Record<Persona, DashboardNavLabel[]> = {
  demo: [
    "Overview",
    "Diagnostic",
    "Valuation",
    "Forecast",
    "Benchmark",
    "Market",
    "Roadmap",
    "Assistant",
  ],
  owner: ["Overview", "Assistant"],
  cfo: ["Overview", "Valuation", "Forecast", "Benchmark", "Market", "Assistant"],
  department_lead: ["Overview", "Diagnostic", "Assistant"],
};

export interface DashboardNavItem {
  index: string;
  label: DashboardNavLabel;
  href: string;
}

function matchesRoute(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function getDashboardNav(companyId: string | null): DashboardNavItem[] {
  const setup = "/companies";

  return [
    { index: "00", label: "Overview", href: "/dashboard" },
    {
      index: "01",
      label: "Diagnostic",
      href: companyId ? `/companies/${companyId}/assessment` : setup,
    },
    {
      index: "02",
      label: "Valuation",
      href: companyId ? `/companies/${companyId}/valuation` : setup,
    },
    {
      index: "03",
      label: "Forecast",
      href: companyId ? `/companies/${companyId}/forecast` : setup,
    },
    {
      index: "04",
      label: "Benchmark",
      href: companyId ? `/companies/${companyId}/benchmark` : setup,
    },
    {
      index: "05",
      label: "Market",
      href: companyId ? `/companies/${companyId}/market-research` : setup,
    },
    {
      index: "06",
      label: "Roadmap",
      href: companyId ? `/companies/${companyId}/roadmap` : setup,
    },
    { index: "07", label: "Assistant", href: "/assistant" },
  ];
}

export function isDashboardNavActive(
  pathname: string,
  label: DashboardNavLabel,
  companyId: string | null,
): boolean {
  if (label === "Overview") return pathname === "/dashboard";
  if (label === "Assistant") return matchesRoute(pathname, "/assistant");
  if (!companyId) return false;

  const base = `/companies/${companyId}`;
  if (label === "Diagnostic") {
    return (
      matchesRoute(pathname, `${base}/assessment`) ||
      matchesRoute(pathname, `${base}/results`)
    );
  }
  if (label === "Valuation") return matchesRoute(pathname, `${base}/valuation`);
  if (label === "Forecast") return matchesRoute(pathname, `${base}/forecast`);
  if (label === "Benchmark") return matchesRoute(pathname, `${base}/benchmark`);
  if (label === "Market") return matchesRoute(pathname, `${base}/market-research`);
  return matchesRoute(pathname, `${base}/roadmap`);
}

export function filterNavByPersona(
  items: DashboardNavItem[],
  persona: Persona,
): DashboardNavItem[] {
  const allowed = PERSONA_NAV_LABELS[persona];
  return items.filter((item) => allowed.includes(item.label));
}
