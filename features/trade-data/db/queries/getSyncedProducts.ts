import "server-only";
import { db } from "@/lib/db/client";
import { taxudWeeklyRows } from "@/lib/db/schemas/taxudWeeklyRows";

/**
 * Every distinct `product` value present in the synced data, sorted.
 * The product selector's option list. No aggregation — one column, deduped.
 */
export async function getSyncedProducts(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ product: taxudWeeklyRows.product })
    .from(taxudWeeklyRows)
    .orderBy(taxudWeeklyRows.product);

  return rows.map((row) => row.product);
}
