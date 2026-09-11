import "server-only";
import { db } from "@/lib/db/client";
import { rawComextRuImports } from "@/lib/db/schemas/rawComextRuImports";
import type { RuYearRow } from "@/features/ru-trade-timeline/types";

/**
 * Every raw row in raw_comext_ru_imports — the table only ever holds RU
 * across every chapter, so there's nothing to filter by here. Which CN8
 * prefixes form which comparison series is a read-time aggregation
 * decision (getRuYearlyTonnesByHeading's job), not a query concern.
 */
export async function getAllComextRuRows(): Promise<RuYearRow[]> {
  const rows = await db
    .select({
      cn8ProductCode: rawComextRuImports.cn8ProductCode,
      period: rawComextRuImports.period,
      quantity100kg: rawComextRuImports.quantity100kg,
    })
    .from(rawComextRuImports);

  return rows.map((r) => ({
    cn8ProductCode: r.cn8ProductCode,
    period: r.period,
    quantity100kg: r.quantity100kg === null ? 0 : Number(r.quantity100kg),
  }));
}
