import "server-only";
import { like, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { rawComextImports } from "@/lib/db/schemas/rawComextImports";
import type { ComextYearlyTotal } from "@/features/trade-data/types";

/**
 * EU-wide yearly 100-kg totals per partner for one HS heading, summed in
 * Postgres — matched by CN8 prefix, since a CN8 code's first four digits
 * are its heading. No per-row/monthly detail crosses the wire: nothing
 * downstream of `getComextYearlyTonnesByPartner` needs it, so the sum
 * happens here instead of in JS.
 */
export async function getComextYearlyTotalsByHeading(
  heading: string,
): Promise<ComextYearlyTotal[]> {
  const yearExpr = sql<string>`left(${rawComextImports.period}, 4)`;

  const rows = await db
    .select({
      year: yearExpr,
      partnerCode: rawComextImports.partnerCode,
      quantity100kg: sql<string | null>`sum(${rawComextImports.quantity100kg})`,
    })
    .from(rawComextImports)
    .where(like(rawComextImports.cn8ProductCode, `${heading}%`))
    .groupBy(yearExpr, rawComextImports.partnerCode);

  return rows.map((r) => ({
    year: r.year,
    partnerCode: r.partnerCode,
    quantity100kg: r.quantity100kg === null ? 0 : Number(r.quantity100kg),
  }));
}
