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

/**
 * Whether the year at index `i` should get an x-axis label. The last year
 * (`lastIndex`) always does — but naively OR-ing that in on top of the
 * `step` thinning (as `i % step === 0 || i === lastIndex`) can still
 * collide: whichever step-selected index falls closest to `lastIndex` can
 * land as little as 1 year-slot away from it, well under the spacing
 * `step` was chosen to guarantee. This suppresses that one neighbor
 * instead, so the forced last-year label always keeps its full spacing.
 */
export function shouldShowYearLabel(i: number, lastIndex: number, step: number): boolean {
  if (i === lastIndex) return true;
  if (i % step !== 0) return false;
  return lastIndex - i >= step;
}
