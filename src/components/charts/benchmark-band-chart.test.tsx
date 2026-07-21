import { describe, expect, it } from "vitest";
import { BENCHMARK_BAND_CHART_LAYOUT } from "./benchmark-band-chart-layout";
import { VALUATION_RANGE_CHART_LAYOUT } from "./valuation-range-chart-layout";

describe("BenchmarkBandChart", () => {
  it("uses the same visual scale as the valuation range chart", () => {
    expect(BENCHMARK_BAND_CHART_LAYOUT.width).toBe(
      VALUATION_RANGE_CHART_LAYOUT.width,
    );
    expect(BENCHMARK_BAND_CHART_LAYOUT.minCssWidth).toBe(
      VALUATION_RANGE_CHART_LAYOUT.minCssWidth,
    );
    expect(BENCHMARK_BAND_CHART_LAYOUT.rowHeight).toBe(
      VALUATION_RANGE_CHART_LAYOUT.rowHeight,
    );
  });
});
