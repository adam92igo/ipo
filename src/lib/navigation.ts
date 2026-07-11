export type DashboardNavLabel =
  | "Overview"
  | "Diagnostic"
  | "Valuation"
  | "Roadmap"
  | "Assistant";

export interface DashboardNavItem {
  index: string;
  label: DashboardNavLabel;
  href: string;
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
      label: "Roadmap",
      href: companyId ? `/companies/${companyId}/roadmap` : setup,
    },
    { index: "04", label: "Assistant", href: "/assistant" },
  ];
}

export function isDashboardNavActive(
  pathname: string,
  label: DashboardNavLabel,
  companyId: string | null,
): boolean {
  if (label === "Overview") return pathname === "/dashboard";
  if (label === "Assistant") return pathname.startsWith("/assistant");
  if (!companyId) return pathname.startsWith("/companies");

  const base = `/companies/${companyId}`;
  if (label === "Diagnostic") {
    return (
      pathname.startsWith(`${base}/assessment`) ||
      pathname.startsWith(`${base}/results`)
    );
  }
  if (label === "Valuation") return pathname.startsWith(`${base}/valuation`);
  return pathname.startsWith(`${base}/roadmap`);
}
