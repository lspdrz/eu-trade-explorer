import "server-only";
import { COMEXT_PARTNER_NAMES } from "@/features/constants/comextPartnerNames";
import { getComextImportRows } from "@/features/globe/db/queries/getComextImportRows";
import type { PartnerImportTotal } from "@/features/globe/types";

const HUNDRED_KG_PER_TONNE = 10;

/**
 * All-time EU fertilizer import totals per partner country, in tonnes,
 * summed across every year and both HS headings — the globe's read model.
 */
export async function getCountryImportTotals(): Promise<PartnerImportTotal[]> {
  return aggregateCountryTotals(await getComextImportRows());
}

/**
 * Collapses raw (partner, 100-kg quantity) rows into one tonnes total per
 * partner. Partner codes absent from COMEXT_PARTNER_NAMES — EU aggregates,
 * stores-and-provisions, not-specified — are dropped; that map is the
 * country allowlist. Sorted by tonnes descending, ties broken by partner
 * code ascending, for a deterministic top-N. Exported beside its only
 * caller so it's unit-testable without a database.
 */
export function aggregateCountryTotals(
  rows: { partnerCode: string; quantity100kg: number }[],
): PartnerImportTotal[] {
  const tonnesByCode = new Map<string, number>();

  for (const row of rows) {
    if (!(row.partnerCode in COMEXT_PARTNER_NAMES)) continue;
    const tonnes = row.quantity100kg / HUNDRED_KG_PER_TONNE;
    tonnesByCode.set(
      row.partnerCode,
      (tonnesByCode.get(row.partnerCode) ?? 0) + tonnes,
    );
  }

  return [...tonnesByCode.entries()]
    .map(([partnerCode, tonnes]) => ({
      partnerCode,
      partner: COMEXT_PARTNER_NAMES[partnerCode],
      tonnes,
    }))
    .sort(
      (a, b) =>
        b.tonnes - a.tonnes || a.partnerCode.localeCompare(b.partnerCode),
    );
}
