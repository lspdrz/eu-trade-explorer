import "server-only";
import { or, like, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { rawComextRuImports } from "@/lib/db/schemas/rawComextRuImports";

/**
 * Yearly RU import tonnes per HS chapter, summed in SQL — never pulls raw
 * CN8×period rows into the app (the table is 584k+ rows; this query
 * returns at most chapters.length x years-present, tens of rows). The
 * `LIKE 'XX%'` filter is served by raw_comext_ru_imports_cn8_prefix_idx
 * (text_pattern_ops); `left(...)` is only computed on the already-narrowed
 * matching rows for grouping.
 */
export async function getComextRuYearlyTonnesByChapters(
  chapters: string[],
): Promise<{ chapter: string; year: number; quantity100kg: number }[]> {
  if (chapters.length === 0) return [];

  const chapterExpr = sql<string>`left(${rawComextRuImports.cn8ProductCode}, 2)`;
  const yearExpr = sql<string>`left(${rawComextRuImports.period}, 4)`;

  const rows = await db
    .select({
      chapter: chapterExpr,
      year: yearExpr,
      quantity100kg: sql<string>`sum(${rawComextRuImports.quantity100kg})`,
    })
    .from(rawComextRuImports)
    .where(or(...chapters.map((c) => like(rawComextRuImports.cn8ProductCode, `${c}%`))))
    .groupBy(chapterExpr, yearExpr);

  return rows.map((r) => ({
    chapter: r.chapter,
    year: Number(r.year),
    quantity100kg: Number(r.quantity100kg),
  }));
}
