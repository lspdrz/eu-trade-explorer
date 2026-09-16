import "server-only";
import { COMEXT_PARTNER_NAMES } from "@/features/constants/comextPartnerNames";
import { getComextPartnerTotals } from "@/features/globe/db/queries/getComextPartnerTotals";
import type { PartnerImportTotal } from "@/features/globe/types";

const HUNDRED_KG_PER_TONNE = 10;

export async function getCountryImportTotals(): Promise<PartnerImportTotal[]> {
  const rows = await getComextPartnerTotals();

  return rows
    .filter((row) => row.partnerCode in COMEXT_PARTNER_NAMES)
    .map((row) => ({
      partnerCode: row.partnerCode,
      partner: COMEXT_PARTNER_NAMES[row.partnerCode],
      tonnes: row.quantity100kg / HUNDRED_KG_PER_TONNE,
    }))
    .sort(
      (a, b) =>
        b.tonnes - a.tonnes || a.partnerCode.localeCompare(b.partnerCode),
    );
}
