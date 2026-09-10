import "server-only";
import { db } from "@/lib/db/client";
import { rawComextImports } from "@/lib/db/schemas/rawComextImports";
import { COMEXT_PARTNER_NAMES } from "@/features/constants/comextPartnerNames";

/**
 * Every distinct partner in `raw_comext_imports`, named and name-sorted — the
 * options the COMEXT partner pickers offer. COMEXT stores geonomenclature
 * codes only, so names come from the read-side map; codes not in it
 * (aggregates like EXT_EU27_2020, stores-and-provisions pseudo-codes) are
 * dropped — that map is also the country allowlist. Read straight from an RSC
 * (one DISTINCT, nothing to orchestrate).
 */
export async function getComextPartners(): Promise<
  { code: string; name: string }[]
> {
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
