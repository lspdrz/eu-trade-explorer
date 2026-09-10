import "server-only";
import { db } from "@/lib/db/client";
import { rawTaxudWeeklyRows } from "@/lib/db/schemas/rawTaxudWeeklyRows";

/**
 * Every distinct `product` in `raw_taxud_weekly_rows`, sorted — the
 * surveillance product selector's options (COMEXT's are the static
 * COMEXT_PRODUCTS). No aggregation, one column, deduped.
 */
export async function getAgrifoodProducts(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ product: rawTaxudWeeklyRows.product })
    .from(rawTaxudWeeklyRows)
    .orderBy(rawTaxudWeeklyRows.product);

  return rows.map((row) => row.product);
}
