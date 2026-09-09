import "server-only";
import { getWeeklyRowsByProduct } from "../db/queries/getWeeklyRowsByProduct";
import type { TaxudWeekRow, YearlyPartnerTotal } from "../types";

const KG_PER_TONNE = 1_000;

/**
 * Reads every raw synced row for a product and aggregates them into yearly
 * EU-wide totals per partner — aggregation happens here, at read time, not
 * in the sync feature. Coordinates the DB read and the pure computation
 * (`aggregateYearlyTonnesByPartner` below); never touches the DB itself
 * (see architecture-decisions.md).
 */
export async function getYearlyTonnesByPartner(
  product: string,
): Promise<YearlyPartnerTotal[]> {
  const rows = await getWeeklyRowsByProduct(product);
  return aggregateYearlyTonnesByPartner(rows);
}

/**
 * Collapses weekly, per-member-state trade rows into EU-wide yearly totals
 * per partner country, in tonnes. Exported alongside its only caller so it
 * stays unit-testable without a database.
 *
 * The TAXUD API reports one row per (week, member state, partner, product);
 * this sums `kg` across all weeks and member states for each
 * (marketingYear, partnerCode) pair. Results are sorted by year, then
 * partner code, for deterministic output.
 */
export function aggregateYearlyTonnesByPartner(
  rows: TaxudWeekRow[],
): YearlyPartnerTotal[] {
  const totals = new Map<string, YearlyPartnerTotal>();

  for (const row of rows) {
    const key = `${row.marketingYear}|${row.partnerCode}`;
    const existing = totals.get(key);

    if (existing) {
      existing.tonnes += row.kg / KG_PER_TONNE;
    } else {
      totals.set(key, {
        year: row.marketingYear,
        partnerCode: row.partnerCode,
        partner: row.partner,
        tonnes: row.kg / KG_PER_TONNE,
      });
    }
  }

  return [...totals.values()].sort(
    (a, b) =>
      a.year.localeCompare(b.year) || a.partnerCode.localeCompare(b.partnerCode),
  );
}
