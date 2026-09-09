import "server-only";
import { db } from "@/lib/db/client";
import { rawTaxudWeeklyRows } from "@/lib/db/schemas/rawTaxudWeeklyRows";

/**
 * Every distinct `product` value present in the synced data, sorted.
 * The product selector's option list. No aggregation — one column, deduped.
 */
export async function getSyncedProducts(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ product: rawTaxudWeeklyRows.product })
    .from(rawTaxudWeeklyRows)
    .orderBy(rawTaxudWeeklyRows.product);

  return rows.map((row) => row.product);
}
