import type { GroupedSeries, GroupedSeriesPoint } from "@/features/trade-data/types";

/**
 * Shapes flat observations into the bar chart's dense grid: the selected
 * series, over the selected inclusive year range, zero-filled. Pure — no
 * React, no DB. A "series" is whatever the caller keys by (a partner country,
 * or a product); this function doesn't care. This is where the chart's
 * "missing data means a zero bar, not a gap" rule lives.
 */
export function selectGroupedSeries(
  rows: GroupedSeriesPoint[],
  selection: { seriesKeys: string[]; fromYear: number; toYear: number },
): GroupedSeries {
  const { seriesKeys, fromYear, toYear } = selection;

  const years = Array.from(
    { length: Math.max(0, toYear - fromYear + 1) },
    (_, i) => fromYear + i,
  );

  const selected = new Set(seriesKeys);
  const tonnesByKey = new Map<string, number>();
  for (const row of rows) {
    if (row.year < fromYear || row.year > toYear) continue;
    if (!selected.has(row.seriesKey)) continue;
    tonnesByKey.set(`${row.seriesKey}|${row.year}`, row.tonnes);
  }

  const points: GroupedSeriesPoint[] = [];
  for (const seriesKey of seriesKeys) {
    for (const year of years) {
      points.push({
        seriesKey,
        year,
        tonnes: tonnesByKey.get(`${seriesKey}|${year}`) ?? 0,
      });
    }
  }

  return { years, points };
}
