import "server-only";
import { or, like, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { rawComextRuImports } from "@/lib/db/schemas/rawComextRuImports";

/**
 * Yearly RU import tonnes across a set of CN8 prefixes (e.g. fertiliser's
 * two headings, 2814/3102), summed in SQL. Same LIKE-then-group shape as
 * getComextRuYearlyTonnesByChapters, just without the chapter dimension.
 */
export async function getComextRuYearlyTonnesByPrefixes(
  prefixes: string[],
): Promise<{ year: number; quantity100kg: number }[]> {
  if (prefixes.length === 0) return [];

  const yearExpr = sql<string>`left(${rawComextRuImports.period}, 4)`;

  const rows = await db
    .select({
      year: yearExpr,
      quantity100kg: sql<string>`sum(${rawComextRuImports.quantity100kg})`,
    })
    .from(rawComextRuImports)
    .where(or(...prefixes.map((p) => like(rawComextRuImports.cn8ProductCode, `${p}%`))))
    .groupBy(yearExpr);

  return rows.map((r) => ({
    year: Number(r.year),
    quantity100kg: Number(r.quantity100kg),
  }));
}
