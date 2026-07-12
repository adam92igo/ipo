import { describe, expect, it } from "vitest";
import { VALUATION_RANGE_CHART_LAYOUT } from "./valuation-range-chart-layout";

describe("valuation range chart layout", () => {
  it("reserves readable label and track geometry at its minimum CSS width", () => {
    expect(VALUATION_RANGE_CHART_LAYOUT).toMatchObject({
      width: 840,
      labelWidth: 240,
      padRight: 80,
      minCssWidth: 840,
    });
    expect(
      VALUATION_RANGE_CHART_LAYOUT.width -
        VALUATION_RANGE_CHART_LAYOUT.labelWidth -
        VALUATION_RANGE_CHART_LAYOUT.padRight,
    ).toBeGreaterThanOrEqual(500);
  });
});
