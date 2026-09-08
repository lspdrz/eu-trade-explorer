import "server-only";
import { and, eq } from "drizzle-orm";
import type { RawTaxudWeekRow } from "../../types";
import { db } from "@/lib/db/client";
import { taxudWeeklyRows } from "@/lib/db/schemas/taxudWeeklyRows";
import { batchesOf } from "../../utils/batch";

const BATCH_SIZE = 500;

/**
 * Replaces one product's raw weekly rows — scoped to `marketingYear` if
 * given, or the product's entire history if not — with every row
 * `source` yields.
 *
 * Pure write, no decision logic: `source` must already be confirmed
 * non-empty by the caller (see runFertilizerSync.ts, which peeks it
 * first). Given an empty source, this still deletes the existing scope
 * and writes nothing — that guard is the caller's job, not this file's.
 *
 * No upsert/business key (see taxudWeeklyRows.ts for why). Delete + all
 * inserts run in one transaction, so a source that fails partway leaves
 * prior data for that scope untouched.
 */
export async function replaceProductData(params: {
  product: string;
  marketingYear?: string;
  source: AsyncGenerator<RawTaxudWeekRow>;
}): Promise<{ rowsWritten: number }> {
  // One timestamp for the whole run — "when was this synced" is a
  // per-run fact, not a per-row one.
  const syncedAt = new Date();
  let rowsWritten = 0;

  await db.transaction(async (tx) => {
    const scope = params.marketingYear
      ? and(
          eq(taxudWeeklyRows.product, params.product),
          eq(taxudWeeklyRows.marketingYear, params.marketingYear),
        )
      : eq(taxudWeeklyRows.product, params.product);

    await tx.delete(taxudWeeklyRows).where(scope);

    for await (const batch of batchesOf(params.source, BATCH_SIZE)) {
      // Straight pass-through, plus syncedAt: RawTaxudWeekRow's fields match
      // the table's columns exactly (id is auto-generated on insert).
      await tx.insert(taxudWeeklyRows).values(batch.map((row) => ({ ...row, syncedAt })));
      rowsWritten += batch.length;
    }
  });

  return { rowsWritten };
}
