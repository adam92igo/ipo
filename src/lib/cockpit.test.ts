import { describe, expect, it } from "vitest";
import { deriveMarketTrajectory, valuationState } from "./cockpit";

describe("deriveMarketTrajectory", () => {
  it.each([
    [null, "foundation"],
    [0, "foundation"],
    [39.99, "foundation"],
    [40, "financial_control"],
    [59.99, "financial_control"],
    [60, "governance"],
    [74.99, "governance"],
    [75, "equity_story"],
    [89.99, "equity_story"],
    [90, "market_ready"],
    [100, "market_ready"],
  ])("maps %s to %s", (score, expected) => {
    expect(deriveMarketTrajectory(score).current.id).toBe(expected);
  });

  it("marks every earlier stage completed and keeps labels textual", () => {
    const result = deriveMarketTrajectory(72);
    expect(result.stages.map((stage) => [stage.label, stage.state])).toEqual([
      ["Foundation", "completed"],
      ["Financial control", "completed"],
      ["Governance", "current"],
      ["Equity story", "future"],
      ["Market ready", "future"],
    ]);
  });
});

describe("valuationState", () => {
  it("distinguishes missing financials from a pending valuation run", () => {
    expect(valuationState(0, null)).toEqual({ kind: "missing_financials" });
    expect(valuationState(3, null)).toEqual({ kind: "ready_to_run" });
  });
});
