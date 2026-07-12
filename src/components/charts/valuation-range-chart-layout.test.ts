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
const getRangeValueLabelPlacements = (
  layoutModule as typeof layoutModule & {
    getRangeValueLabelPlacements?: (
      lowX: number,
      highX: number,
      collapsed: boolean,
    ) => Array<{
      value: "low" | "high";
      x: number;
      yOffset: number;
      textAnchor: "start" | "end";
    }>;
  }
).getRangeValueLabelPlacements;

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

  it("returns one direct value annotation for a collapsed range", () => {
    const valueX = VALUATION_RANGE_CHART_LAYOUT.labelWidth + 120;

    expect(getRangeValueLabelPlacements?.(valueX, valueX, true)).toEqual([
      {
        value: "low",
        x: valueX + VALUE_LABEL_GAP,
        yOffset: -10,
        textAnchor: "start",
      },
    ]);
  });

  it("separates narrow range annotations onto distinct vertical lanes", () => {
    const lowX = VALUATION_RANGE_CHART_LAYOUT.labelWidth + 120;
    const placements = getRangeValueLabelPlacements?.(lowX, lowX + 1, false);

    expect(placements).toHaveLength(2);
    expect(
      placements?.map(({ value, yOffset }) => ({ value, yOffset })),
    ).toEqual([
      { value: "low", yOffset: 18 },
      { value: "high", yOffset: -10 },
    ]);
    expect(placements?.[0]?.yOffset).not.toBe(placements?.[1]?.yOffset);
  });

  it("keeps a high annotation at the track end inside the SVG", () => {
    const trackEnd =
      VALUATION_RANGE_CHART_LAYOUT.width -
      VALUATION_RANGE_CHART_LAYOUT.padRight;
    const placements = getRangeValueLabelPlacements?.(
      VALUATION_RANGE_CHART_LAYOUT.labelWidth + 120,
      trackEnd,
      false,
    );

    expect(placements?.[1]).toEqual({
      value: "high",
      x: trackEnd - VALUE_LABEL_GAP,
      yOffset: -10,
      textAnchor: "end",
    });
    expect(placements?.[1]?.x).toBeLessThan(
      VALUATION_RANGE_CHART_LAYOUT.width,
    );
  });

  it("keeps distinct raw values separate when their projected coordinates match", () => {
    const projectedX = VALUATION_RANGE_CHART_LAYOUT.labelWidth + 120;
    const placements = getRangeValueLabelPlacements?.(
      projectedX,
      projectedX,
      false,
    );

    expect(placements).toHaveLength(2);
    expect(placements?.map(({ value }) => value)).toEqual(["low", "high"]);
  });
});
