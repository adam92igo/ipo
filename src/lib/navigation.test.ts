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

  it("matches nested module routes without matching unrelated prefixes", () => {
    expect(isDashboardNavActive("/companies/company-1/results", "Diagnostic", "company-1")).toBe(true);
    expect(isDashboardNavActive("/assistant", "Assistant", "company-1")).toBe(true);
    expect(isDashboardNavActive("/companies/company-2/valuation", "Valuation", "company-1")).toBe(false);
  });
});
