import "server-only";
import { db } from "@/lib/db/client";
import { rawTaxudWeeklyRows } from "@/lib/db/schemas/rawTaxudWeeklyRows";

/**
 * Every distinct partner in `raw_taxud_weekly_rows`, name-sorted — the
 * options the surveillance partner pickers offer. The agrifood feed carries
 * the name on every row, so no lookup. Read straight from an RSC (one
 * DISTINCT, nothing to orchestrate).
 */
export async function getAgrifoodPartners(): Promise<
  { code: string; name: string }[]
> {
  const rows = await db
    .selectDistinct({
      code: rawTaxudWeeklyRows.partnerCode,
      name: rawTaxudWeeklyRows.partner,
    })
    .from(rawTaxudWeeklyRows);

  return rows.sort((a, b) => a.name.localeCompare(b.name));
}
