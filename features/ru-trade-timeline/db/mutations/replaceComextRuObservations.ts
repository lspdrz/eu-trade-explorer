import "server-only";
import { inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { rawComextRuImports } from "@/lib/db/schemas/rawComextRuImports";
import type { ComextRuObservation } from "@/features/ru-trade-timeline/types";

const BATCH_SIZE = 500;

/**
 * Replaces one set of CN8 codes' rows, in one transaction. Scoped by
 * `cn8ProductCodes` (not by period): the backfill script's chunks each
 * cover the same full period range but a disjoint set of CN8 codes, so
 * scoping the delete by product identity — same principle as
 * replaceComextObservations's heading-prefix scope — is what makes each
 * chunk's write independently idempotent without clobbering the others.
 */
export async function replaceComextRuObservations({
  cn8ProductCodes,
  observations,
}: {
  cn8ProductCodes: string[];
  observations: ComextRuObservation[];
}): Promise<{ rowsWritten: number }> {
  const syncedAt = new Date();

  await db.transaction(async (tx) => {
    await tx
      .delete(rawComextRuImports)
      .where(inArray(rawComextRuImports.cn8ProductCode, cn8ProductCodes));

    for (let i = 0; i < observations.length; i += BATCH_SIZE) {
      const slice = observations.slice(i, i + BATCH_SIZE);
      await tx.insert(rawComextRuImports).values(
        slice.map((o) => ({
          cn8ProductCode: o.cn8ProductCode,
          partnerCode: "RU",
          period: o.period,
          quantity100kg: o.quantity100kg === null ? null : String(o.quantity100kg),
          valueEuros: o.valueEuros === null ? null : String(o.valueEuros),
          syncedAt,
        })),
      );
    }
  });

  return { rowsWritten: observations.length };
}
