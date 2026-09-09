import "server-only";
import { db } from "@/lib/db/client";
import { COMEXT_PARTNER_NAMES } from "../../constants/comextPartnerNames";
import { rawComextImports } from "@/lib/db/schemas/rawComextImports";
import { rawTaxudWeeklyRows } from "@/lib/db/schemas/rawTaxudWeeklyRows";
import type { TradeSource } from "../../types";

/**
 * Every distinct partner that appears in a source's snapshot table, named —
 * the partner analog of getSyncedProducts. Feeds both chart tabs' partner
 * pickers. Read straight from an RSC (one DISTINCT, nothing to orchestrate).
 *
 * COMEXT stores geonomenclature codes only, so names come from the read-side
 * map; codes not in it (aggregates like EXT_EU27_2020, stores-and-provisions
 * pseudo-codes) are dropped — that map is also the country allowlist.
 */
export async function getSourcePartners(
  source: TradeSource,
): Promise<{ code: string; name: string }[]> {
  if (source === "comext") {
    const rows = await db
      .selectDistinct({ code: rawComextImports.partnerCode })
      .from(rawComextImports);
    return rows
      .flatMap(({ code }) => {
        const name = COMEXT_PARTNER_NAMES[code];
        return name ? [{ code, name }] : [];
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  const rows = await db
    .selectDistinct({
      code: rawTaxudWeeklyRows.partnerCode,
      name: rawTaxudWeeklyRows.partner,
    })
    .from(rawTaxudWeeklyRows);
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}
