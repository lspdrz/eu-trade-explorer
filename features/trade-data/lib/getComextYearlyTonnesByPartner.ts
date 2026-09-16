import "server-only";
import { COMEXT_PARTNER_NAMES } from "@/features/constants/comextPartnerNames";
import { COMEXT_PRODUCT_HEADINGS } from "@/features/trade-data/constants/comextProducts";
import { getComextYearlyTotalsByHeading } from "@/features/trade-data/db/queries/getComextYearlyTotalsByHeading";
import type { ComextProduct, YearlyPartnerTotal } from "@/features/trade-data/types";

const HUNDRED_KG_PER_TONNE = 10;

/**
 * Reads a product's HS heading's yearly per-partner totals — Postgres does
 * the summing (see getComextYearlyTotalsByHeading), so this just converts
 * 100kg to tonnes, drops partner codes absent from COMEXT_PARTNER_NAMES —
 * aggregates, stores & provisions, not-specified — since that map is the
 * country allowlist, and sorts by year then partner code for
 * deterministic output. An unknown product (one without a heading) yields
 * [] and never touches the DB; the RSC's product fallback means that
 * shouldn't happen in practice.
 */
export async function getComextYearlyTonnesByPartner(
  product: string,
): Promise<YearlyPartnerTotal[]> {
  const heading = COMEXT_PRODUCT_HEADINGS[product as ComextProduct];
  if (!heading) return [];
  const rows = await getComextYearlyTotalsByHeading(heading);

  return rows
    .filter((row) => row.partnerCode in COMEXT_PARTNER_NAMES)
    .map((row) => ({
      year: row.year,
      partnerCode: row.partnerCode,
      partner: COMEXT_PARTNER_NAMES[row.partnerCode],
      tonnes: row.quantity100kg / HUNDRED_KG_PER_TONNE,
    }))
    .sort(
      (a, b) =>
        a.year.localeCompare(b.year) || a.partnerCode.localeCompare(b.partnerCode),
    );
}
