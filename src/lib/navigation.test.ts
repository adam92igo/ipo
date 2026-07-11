import { describe, expect, it } from "vitest";
import { getDashboardNav, isDashboardNavActive } from "./navigation";

describe("dashboard navigation", () => {
  it("routes company modules through the only company", () => {
    expect(getDashboardNav("company-1").map((item) => [item.label, item.href])).toEqual([
      ["Overview", "/dashboard"],
      ["Diagnostic", "/companies/company-1/assessment"],
      ["Valuation", "/companies/company-1/valuation"],
      ["Roadmap", "/companies/company-1/roadmap"],
      ["Assistant", "/assistant"],
    ]);
  });

  it("sends unavailable company modules to company setup", () => {
    expect(getDashboardNav(null).slice(1, 4).every((item) => item.href === "/companies")).toBe(true);
  });

  it("does not mark setup-bound company modules active", () => {
    for (const label of ["Diagnostic", "Valuation", "Roadmap"] as const) {
      expect(isDashboardNavActive("/companies", label, null)).toBe(false);
    }
  });

  it("matches nested module routes without matching unrelated prefixes", () => {
    expect(isDashboardNavActive("/companies/company-1/results", "Diagnostic", "company-1")).toBe(true);
    expect(isDashboardNavActive("/assistant", "Assistant", "company-1")).toBe(true);
    expect(isDashboardNavActive("/companies/company-2/valuation", "Valuation", "company-1")).toBe(false);
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
