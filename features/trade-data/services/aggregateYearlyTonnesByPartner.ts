import type { TaxudWeekRow, YearlyPartnerTotal } from "../types";

const KG_PER_TONNE = 1_000;

/**
 * Collapses weekly, per-member-state trade rows into EU-wide yearly totals
 * per partner country, in tonnes. A helper for `getYearlyTonnesByPartner`
 * (its only caller), kept exported so it's unit-testable without a
 * database — see this file's own test, deliberately separate from
 * `getWeeklyRowsByProduct`'s slower, real-database one.
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
