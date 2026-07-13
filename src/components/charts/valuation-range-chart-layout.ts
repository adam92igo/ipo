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

export interface RangeValueLabelPlacement {
  value: "low" | "high";
  x: number;
  yOffset: number;
  textAnchor: "start" | "end";
}

export function getRangeValueLabelPlacements(
  lowX: number,
  highX: number,
  collapsed: boolean,
): RangeValueLabelPlacement[] {
  const lowPlacement = getLowValueLabelPlacement(lowX);

  if (collapsed) {
    return [{ value: "low", yOffset: -10, ...lowPlacement }];
  }

  return [
    { value: "low", yOffset: 18, ...lowPlacement },
    {
      value: "high",
      yOffset: -10,
      ...getLowValueLabelPlacement(highX),
    },
  ];
}
