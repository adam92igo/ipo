export const VALUATION_RANGE_CHART_LAYOUT = {
  width: 840,
  rowHeight: 52,
  labelWidth: 240,
  padRight: 80,
  minCssWidth: 840,
  valueLabelGap: 8,
  maxValueLabelWidth: 80,
} as const;

export function getLowValueLabelPlacement(valueX: number): {
  x: number;
  textAnchor: "start" | "end";
} {
  const { width, valueLabelGap, maxValueLabelWidth } =
    VALUATION_RANGE_CHART_LAYOUT;

  if (valueX + valueLabelGap + maxValueLabelWidth < width) {
    return { x: valueX + valueLabelGap, textAnchor: "start" };
  }

  return {
    x: Math.min(valueX - valueLabelGap, width - valueLabelGap),
    textAnchor: "end",
  };
}
