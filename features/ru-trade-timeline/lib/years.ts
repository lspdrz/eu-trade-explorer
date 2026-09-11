const HUNDRED_KG_PER_TONNE = 10;
const FIRST_YEAR = 2010;
const LAST_YEAR = 2025;

/**
 * The fixed, shared x-axis every series in this feature aligns to. Fixed
 * (not derived per-query) because each series now comes from an
 * independent SQL query that could span a different actual year range
 * (e.g. a rarely-traded chapter) — without a shared range, series
 * wouldn't line up on one chart. Caps at 2025 rather than the current
 * year: the raw table's latest rows are always a partial year (Eurostat
 * publishes with a lag), which would render as a misleading cliff-drop.
 */
export const YEARS: number[] = Array.from(
  { length: LAST_YEAR - FIRST_YEAR + 1 },
  (_, i) => FIRST_YEAR + i,
);

/**
 * Converts a sparse (year, quantity100kg) result — from either targeted
 * query in features/ru-trade-timeline/db/queries/ — into a dense,
 * tonnes-converted array aligned index-for-index with YEARS. A year
 * outside YEARS (the current partial year) is silently dropped, not
 * clamped into the range.
 */
export function toYearlyValues(rows: { year: number; quantity100kg: number }[]): number[] {
  const byYear = new Map(rows.map((r) => [r.year, r.quantity100kg / HUNDRED_KG_PER_TONNE]));
  return YEARS.map((y) => byYear.get(y) ?? 0);
}
