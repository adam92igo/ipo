import { describe, expect, it } from "vitest";
import * as layoutModule from "./valuation-range-chart-layout";

const { VALUATION_RANGE_CHART_LAYOUT } = layoutModule;
const VALUE_LABEL_GAP = 8;
const getLowValueLabelPlacement = (
  layoutModule as typeof layoutModule & {
    getLowValueLabelPlacement?: (
      valueX: number,
    ) => { x: number; textAnchor: "start" | "end" };
  }
).getLowValueLabelPlacement;

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

  it("places a minimum low value to the right of the track start", () => {
    const placement = getLowValueLabelPlacement?.(
      VALUATION_RANGE_CHART_LAYOUT.labelWidth,
    );

    expect(placement).toEqual({
      x:
        VALUATION_RANGE_CHART_LAYOUT.labelWidth +
        VALUE_LABEL_GAP,
      textAnchor: "start",
    });
    expect(placement?.x).toBeGreaterThan(
      VALUATION_RANGE_CHART_LAYOUT.labelWidth,
    );
  });

  it("uses a safe end anchor near the chart right boundary", () => {
    const trackEnd =
      VALUATION_RANGE_CHART_LAYOUT.width -
      VALUATION_RANGE_CHART_LAYOUT.padRight;
    const placement = getLowValueLabelPlacement?.(trackEnd);

    expect(placement).toEqual({
      x: trackEnd - VALUE_LABEL_GAP,
      textAnchor: "end",
    });
    expect(placement?.x).toBeLessThan(
      VALUATION_RANGE_CHART_LAYOUT.width,
    );
  });

  it("keeps the method column and minimum low annotation disjoint", () => {
    const longestMethodLabel = "Sector comparables (EV/EBITDA)";
    const methodLabelWidth = longestMethodLabel.length * 12.5 * 0.6;
    const placement = getLowValueLabelPlacement?.(
      VALUATION_RANGE_CHART_LAYOUT.labelWidth,
    );

    expect(methodLabelWidth).toBeLessThan(
      VALUATION_RANGE_CHART_LAYOUT.labelWidth,
    );
    expect(placement?.textAnchor).toBe("start");
    expect(placement?.x).toBeGreaterThan(
      VALUATION_RANGE_CHART_LAYOUT.labelWidth,
    );
  });
});
