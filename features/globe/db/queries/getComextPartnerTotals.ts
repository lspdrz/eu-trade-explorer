import "server-only";
import { like, or, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { rawComextImports } from "@/lib/db/schemas/rawComextImports";
import { COMEXT_FERTILISER_HEADINGS } from "@/features/constants/comextFertiliserHeadings";

export async function getComextPartnerTotals(): Promise<
  { partnerCode: string; quantity100kg: number }[]
> {
  const rows = await db
    .select({
      partnerCode: rawComextImports.partnerCode,
      quantity100kg: sql<string | null>`sum(${rawComextImports.quantity100kg})`,
    })
    .from(rawComextImports)
    .where(
      or(
        ...COMEXT_FERTILISER_HEADINGS.map((h) =>
          like(rawComextImports.cn8ProductCode, `${h}%`),
        ),
      ),
    )
    .groupBy(rawComextImports.partnerCode);

  return rows.map((r) => ({
    partnerCode: r.partnerCode,
    quantity100kg: r.quantity100kg === null ? 0 : Number(r.quantity100kg),
  }));
}
