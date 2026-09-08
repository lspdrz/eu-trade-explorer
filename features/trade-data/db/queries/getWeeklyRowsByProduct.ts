import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { taxudWeeklyRows } from "@/lib/db/schemas/taxudWeeklyRows";
import type { TaxudWeekRow } from "../../types";

/**
 * Reads every raw synced row for a product, converting the numeric-as-
 * string columns to real numbers (`TaxudWeekRow`). No aggregation
 * here — that's `services/getYearlyTonnesByPartner.ts`'s job.
 */
export async function getWeeklyRowsByProduct(product: string): Promise<TaxudWeekRow[]> {
  const rawRows = await db
    .select()
    .from(taxudWeeklyRows)
    .where(eq(taxudWeeklyRows.product, product));

  return rawRows.map((row) => ({
    ...row,
    euroValue: Number(row.euroValue),
    unitValue: Number(row.unitValue),
    kg: Number(row.kg),
    kgEquivalent: Number(row.kgEquivalent),
    coefficient: Number(row.coefficient),
  }));
}
