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

  it("clamps scores below zero and above 100 to the trajectory endpoints", () => {
    const belowMinimum = deriveMarketTrajectory(-10);
    const aboveMaximum = deriveMarketTrajectory(120);

    expect(belowMinimum.current.id).toBe("foundation");
    expect(belowMinimum.stages.map((stage) => stage.state)).toEqual([
      "current",
      "future",
      "future",
      "future",
      "future",
    ]);
    expect(aboveMaximum.current.id).toBe("market_ready");
    expect(aboveMaximum.stages.map((stage) => stage.state)).toEqual([
      "completed",
      "completed",
      "completed",
      "completed",
      "current",
    ]);
  });
});

describe("valuationState", () => {
  it("distinguishes missing financials from a pending valuation run", () => {
    expect(valuationState(0, null)).toEqual({ kind: "missing_financials" });
    expect(valuationState(3, null)).toEqual({ kind: "ready_to_run" });
  });

  it("returns an available valuation unchanged even without financial years", () => {
    const available = {
      kind: "available" as const,
      low: 1_000_000,
      mid: 1_500_000,
      high: 2_000_000,
      methodCount: 3,
      refsVersion: "valuation-refs.v1",
      createdAt: new Date("2026-07-11T12:00:00.000Z"),
    };

    expect(valuationState(0, available)).toBe(available);
  });
});
