import type { GroupedSeries, GroupedSeriesPoint, YearlyPartnerTotal } from "../../types";

/**
 * Shapes the full per-product yearly totals into exactly what the bar chart
 * draws: the selected countries, over the selected inclusive year range, as a
 * dense zero-filled grid. Pure — no React, no DB. This is where the chart's
 * "missing data means a zero bar, not a gap" rule lives.
 */
export function selectGroupedSeries(
  yearlyTotals: YearlyPartnerTotal[],
  selection: { partnerCodes: string[]; fromYear: number; toYear: number },
): GroupedSeries {
  const { partnerCodes, fromYear, toYear } = selection;

  const years = Array.from(
    { length: Math.max(0, toYear - fromYear + 1) },
    (_, i) => fromYear + i,
  );

  const selected = new Set(partnerCodes);
  const tonnesByKey = new Map<string, number>();
  for (const total of yearlyTotals) {
    const year = Number(total.year);
    if (year < fromYear || year > toYear) continue;
    if (!selected.has(total.partnerCode)) continue;
    tonnesByKey.set(`${total.partnerCode}|${year}`, total.tonnes);
  }

  const points: GroupedSeriesPoint[] = [];
  for (const partnerCode of partnerCodes) {
    for (const year of years) {
      points.push({
        partnerCode,
        year,
        tonnes: tonnesByKey.get(`${partnerCode}|${year}`) ?? 0,
      });
    }
  }

  return { years, points };
}
