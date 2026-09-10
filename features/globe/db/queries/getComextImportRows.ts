import "server-only";
import { like, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { rawComextImports } from "@/lib/db/schemas/rawComextImports";
import { GLOBE_HS_HEADINGS } from "@/features/globe/constants/headings";

/**
 * Every `raw_comext_imports` row under either fertilizer HS heading,
 * trimmed to what the all-time per-partner aggregation needs. Matched by
 * CN8 prefix (a CN8's first 4 digits are its heading); the
 * `raw_comext_imports_cn8_prefix_idx` (`text_pattern_ops`) serves both
 * prefix LIKEs. No aggregation here — that's `aggregateCountryTotals`.
 * No period filter — the globe sums across all of recorded time.
 */
export async function getComextImportRows(): Promise<
  { partnerCode: string; quantity100kg: number }[]
> {
  const rows = await db
    .select({
      partnerCode: rawComextImports.partnerCode,
      quantity100kg: rawComextImports.quantity100kg,
    })
    .from(rawComextImports)
    .where(
      or(
        ...GLOBE_HS_HEADINGS.map((h) =>
          like(rawComextImports.cn8ProductCode, `${h}%`),
        ),
      ),
    );

  return rows.map((r) => ({
    partnerCode: r.partnerCode,
    quantity100kg: r.quantity100kg === null ? 0 : Number(r.quantity100kg),
  }));
}
