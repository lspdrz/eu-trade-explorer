import type { PartnerImportTotal } from "@/features/globe/types";

/**
 * The `n` largest origins by tonnage. `totals` is assumed already sorted
 * tonnes-descending (as `aggregateCountryTotals` returns it).
 */
export function topN(totals: PartnerImportTotal[], n: number): string[] {
  if (n <= 0) return [];
  return totals.slice(0, n).map((t) => t.partnerCode);
}
