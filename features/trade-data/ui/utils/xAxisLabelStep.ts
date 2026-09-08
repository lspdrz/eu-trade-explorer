/**
 * How many year-slots to skip between x-axis labels so they don't collide on
 * a wide range. Every year still gets a bar and a tick — only the text labels
 * thin out. The chart always also labels the last year regardless of the step.
 */
export function xAxisLabelStep(yearCount: number): number {
  if (yearCount > 24) return 5;
  if (yearCount > 12) return 2;
  return 1;
}
