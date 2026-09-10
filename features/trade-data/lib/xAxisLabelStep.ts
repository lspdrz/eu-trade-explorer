const MIN_LABEL_PX = 42;

/**
 * How many year-slots to skip between x-axis labels so the text doesn't
 * collide. Based on the pixels available per year, not just the count — a
 * 16-year range is fine on a wide chart but needs thinning on a phone. Every
 * year still gets a bar and a tick; only the labels thin out, and the chart
 * always also labels the last year and any partial year.
 */
export function xAxisLabelStep(yearCount: number, innerWidth: number): number {
  if (yearCount <= 1 || innerWidth <= 0) return 1;
  const pxPerYear = innerWidth / yearCount;
  return Math.max(1, Math.ceil(MIN_LABEL_PX / pxPerYear));
}
