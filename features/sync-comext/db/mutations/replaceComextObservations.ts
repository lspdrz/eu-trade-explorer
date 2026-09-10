import "server-only";
import { and, inArray, like } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { rawComextImports } from "@/lib/db/schemas/rawComextImports";
import type { ComextHeading } from "@/features/sync-comext/constants/headings";
import type { ComextObservation } from "@/features/sync-comext/types";

const BATCH_SIZE = 500;

/**
 * Replaces one heading's rows within a set of periods, in one transaction.
 *
 * Scoped by (heading, periods): a 3102 failure elsewhere in a run must not
 * wipe 2814's rows for these periods, so the delete only touches CN8 codes
 * under `heading` (`LIKE '<heading>%'`). Idempotent — re-running any
 * (heading, period range) is safe.
 *
 * COMEXT isn't streamed — `observations` is a fully-parsed array; inserts
 * are sliced only to stay under Postgres's bind-parameter cap.
 */
export async function replaceComextObservations({
  heading,
  periods,
  observations,
}: {
  heading: ComextHeading;
  periods: string[];
  observations: ComextObservation[];
}): Promise<{ rowsWritten: number }> {
  const syncedAt = new Date();

  await db.transaction(async (tx) => {
    await tx
      .delete(rawComextImports)
      .where(
        and(
          like(rawComextImports.cn8ProductCode, `${heading}%`),
          inArray(rawComextImports.period, periods),
        ),
      );

    for (let i = 0; i < observations.length; i += BATCH_SIZE) {
      const slice = observations.slice(i, i + BATCH_SIZE);
      await tx.insert(rawComextImports).values(
        slice.map((o) => ({
          cn8ProductCode: o.cn8ProductCode,
          partnerCode: o.partnerCode,
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
