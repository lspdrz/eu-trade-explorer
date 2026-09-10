import "server-only";
import { like } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { rawComextImports } from "@/lib/db/schemas/rawComextImports";
import type { ComextYearRow } from "@/features/trade-data/types";

/**
 * Every raw COMEXT import row under an HS heading — matched by CN8 prefix,
 * since a CN8 code's first four digits are its heading. No aggregation here;
 * that's getComextYearlyTonnesByPartner's job. Mirrors
 * getWeeklyRowsByProduct on the surveillance side.
 */
export async function getComextRowsByHeading(
  heading: string,
): Promise<ComextYearRow[]> {
  const rows = await db
    .select({
      partnerCode: rawComextImports.partnerCode,
      period: rawComextImports.period,
      quantity100kg: rawComextImports.quantity100kg,
    })
    .from(rawComextImports)
    .where(like(rawComextImports.cn8ProductCode, `${heading}%`));

  return rows.map((r) => ({
    partnerCode: r.partnerCode,
    period: r.period,
    quantity100kg: r.quantity100kg === null ? 0 : Number(r.quantity100kg),
  }));
}
