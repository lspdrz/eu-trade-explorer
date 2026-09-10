import "server-only";
import { COMEXT_PARTNER_NAMES } from "../constants/comextPartnerNames";
import { COMEXT_PRODUCT_HEADINGS } from "../constants/comextProducts";
import { getComextRowsByHeading } from "../db/queries/getComextRowsByHeading";
import type {
  ComextProduct,
  ComextYearRow,
  YearlyPartnerTotal,
} from "../types";

const HUNDRED_KG_PER_TONNE = 10;

/**
 * Reads every COMEXT row for a product's HS heading and aggregates them into
 * EU-wide yearly totals per partner country — same read-model shape
 * (YearlyPartnerTotal) and same read-time-aggregation split as the
 * surveillance path's getAgrifoodYearlyTonnesByPartner. An unknown product (one
 * without a heading) yields [] and never touches the DB; the RSC's product
 * fallback means that shouldn't happen in practice.
 */
export async function getComextYearlyTonnesByPartner(
  product: string,
): Promise<YearlyPartnerTotal[]> {
  const heading = COMEXT_PRODUCT_HEADINGS[product as ComextProduct];
  if (!heading) return [];
  return aggregateComextYearlyTonnes(await getComextRowsByHeading(heading));
}

/**
 * Collapses monthly, per-CN8 COMEXT rows into EU-wide yearly totals per
 * partner country, in tonnes.
 *
 *   calendar year  = period.slice(0, 4)
 *   tonnes         = sum(quantity100kg) / 10   (100-kg units → tonnes)
 *
 * Partner codes absent from COMEXT_PARTNER_NAMES — aggregates, stores &
 * provisions, not-specified — are dropped; that map is the country
 * allowlist. Results are sorted by year, then partner code, for
 * deterministic output. Exported alongside its only caller so it stays
 * unit-testable without a database.
 */
export function aggregateComextYearlyTonnes(
  rows: ComextYearRow[],
): YearlyPartnerTotal[] {
  const totals = new Map<string, YearlyPartnerTotal>();

  for (const row of rows) {
    const partner = COMEXT_PARTNER_NAMES[row.partnerCode];
    if (!partner) continue;

    const year = row.period.slice(0, 4);
    const key = `${year}|${row.partnerCode}`;
    const tonnes = row.quantity100kg / HUNDRED_KG_PER_TONNE;
    const existing = totals.get(key);

    if (existing) {
      existing.tonnes += tonnes;
    } else {
      totals.set(key, { year, partnerCode: row.partnerCode, partner, tonnes });
    }
  }

  return [...totals.values()].sort(
    (a, b) =>
      a.year.localeCompare(b.year) || a.partnerCode.localeCompare(b.partnerCode),
  );
}
