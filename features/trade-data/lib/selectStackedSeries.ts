import type { StackedCell, StackedSeries, StackedSeriesPoint } from "../types";

/**
 * Shapes flat (partner, product, year) observations into the stacked chart's
 * dense grid: one cell per selected (year, partner), each holding a segment
 * per selected product in selection order, zero-filled, with running tonnes
 * offsets. Pure — no React, no DB. Same "missing data is a zero, not a gap"
 * rule as `selectGroupedSeries`.
 */
export function selectStackedSeries(
  rows: StackedSeriesPoint[],
  selection: {
    partnerCodes: string[];
    products: string[];
    fromYear: number;
    toYear: number;
  },
): StackedSeries {
  const { partnerCodes, products, fromYear, toYear } = selection;

  const years = Array.from(
    { length: Math.max(0, toYear - fromYear + 1) },
    (_, i) => fromYear + i,
  );

  if (partnerCodes.length === 0 || products.length === 0) {
    return { years, partnerCodes, cells: [] };
  }

  const partnerSet = new Set(partnerCodes);
  const productSet = new Set(products);
  const tonnesByKey = new Map<string, number>();
  for (const row of rows) {
    if (row.year < fromYear || row.year > toYear) continue;
    if (!partnerSet.has(row.partnerCode)) continue;
    if (!productSet.has(row.product)) continue;
    tonnesByKey.set(`${row.partnerCode}|${row.product}|${row.year}`, row.tonnes);
  }

  const cells: StackedCell[] = [];
  for (const year of years) {
    for (const partnerCode of partnerCodes) {
      let offset = 0;
      const segments = products.map((product) => {
        const tonnes =
          tonnesByKey.get(`${partnerCode}|${product}|${year}`) ?? 0;
        const y0 = offset;
        offset += tonnes;
        return { product, tonnes, y0, y1: offset };
      });
      cells.push({ year, partnerCode, total: offset, segments });
    }
  }

  return { years, partnerCodes, cells };
}
