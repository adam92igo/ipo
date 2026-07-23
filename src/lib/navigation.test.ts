import { describe, expect, it } from "vitest";
import { filterNavByPersona, getDashboardNav, isDashboardNavActive } from "./navigation";

describe("dashboard navigation", () => {
  it("routes company modules through the only company", () => {
    expect(getDashboardNav("company-1").map((item) => [item.label, item.href])).toEqual([
      ["Overview", "/dashboard"],
      ["Diagnostic", "/companies/company-1/assessment"],
      ["Valuation", "/companies/company-1/valuation"],
      ["Forecast", "/companies/company-1/forecast"],
      ["Benchmark", "/companies/company-1/benchmark"],
      ["Market", "/companies/company-1/market-research"],
      ["Roadmap", "/companies/company-1/roadmap"],
      ["Assistant", "/assistant"],
    ]);
  });

  it("sends unavailable company modules to company setup", () => {
    expect(getDashboardNav(null).slice(1, 7).every((item) => item.href === "/companies")).toBe(true);
  });

  it("does not mark setup-bound company modules active", () => {
    for (const label of ["Diagnostic", "Valuation", "Forecast", "Benchmark", "Market", "Roadmap"] as const) {
      expect(isDashboardNavActive("/companies", label, null)).toBe(false);
    }
  });

  it("matches nested module routes without matching unrelated prefixes", () => {
    expect(isDashboardNavActive("/companies/company-1/results", "Diagnostic", "company-1")).toBe(true);
    expect(isDashboardNavActive("/assistant", "Assistant", "company-1")).toBe(true);
    expect(isDashboardNavActive("/companies/company-2/valuation", "Valuation", "company-1")).toBe(false);
    expect(isDashboardNavActive("/companies/company-1/forecast", "Forecast", "company-1")).toBe(true);
    expect(isDashboardNavActive("/companies/company-1/valuation", "Forecast", "company-1")).toBe(false);
    expect(isDashboardNavActive("/companies/company-1/benchmark", "Benchmark", "company-1")).toBe(true);
    expect(isDashboardNavActive("/companies/company-1/forecast", "Benchmark", "company-1")).toBe(false);
    expect(isDashboardNavActive("/companies/company-1/market-research", "Market", "company-1")).toBe(true);
    expect(isDashboardNavActive("/companies/company-1/benchmark", "Market", "company-1")).toBe(false);
  });

  it("does not match unrelated route prefixes", () => {
    expect(isDashboardNavActive("/assistant-tools", "Assistant", "company-1")).toBe(false);
    expect(
      isDashboardNavActive(
        "/companies/company-1/valuation-old",
        "Valuation",
        "company-1",
      ),
    ).toBe(false);
    expect(
      isDashboardNavActive(
        "/companies/company-1/assessment-old",
        "Diagnostic",
        "company-1",
      ),
    ).toBe(false);
    expect(
      isDashboardNavActive(
        "/companies/company-1/results-old",
        "Diagnostic",
        "company-1",
      ),
    ).toBe(false);
    expect(
      isDashboardNavActive(
        "/companies/company-1/roadmap-old",
        "Roadmap",
        "company-1",
      ),
    ).toBe(false);
  });
});

describe("filterNavByPersona", () => {
  const nav = getDashboardNav("company-1");

  it("demo keeps every module", () => {
    expect(filterNavByPersona(nav, "demo").map((item) => item.label)).toEqual(
      nav.map((item) => item.label),
    );
  });

  it("owner sees only Overview and Assistant", () => {
    expect(filterNavByPersona(nav, "owner").map((item) => item.label)).toEqual([
      "Overview",
      "Assistant",
    ]);
  });

  it("cfo sees the numbers-oriented modules", () => {
    expect(filterNavByPersona(nav, "cfo").map((item) => item.label)).toEqual([
      "Overview",
      "Valuation",
      "Forecast",
      "Benchmark",
      "Market",
      "Assistant",
    ]);
  });

  it("department_lead sees only the diagnostic besides Overview and Assistant", () => {
    expect(filterNavByPersona(nav, "department_lead").map((item) => item.label)).toEqual([
      "Overview",
      "Diagnostic",
      "Assistant",
    ]);
  });
});
