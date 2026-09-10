import { DEFAULT_TOP_N, MAX_GLOBE_COUNTRIES } from "@/features/globe/constants/globeConfig";
import type { PartnerImportTotal } from "@/features/globe/types";
import { topN } from "@/features/globe/utils/topN";

/**
 * The set of origin countries the globe should draw. No explicit request
 * → the top `DEFAULT_TOP_N` by tonnage. An explicit request → exactly
 * that set (order preserved), minus any code with no data, capped.
 */
export function resolveActive(
  totals: PartnerImportTotal[],
  requested: string[],
): string[] {
  if (requested.length === 0)
    return topN(totals, DEFAULT_TOP_N).map((t) => t.partnerCode);
  const known = new Set(totals.map((t) => t.partnerCode));
  return requested.filter((c) => known.has(c)).slice(0, MAX_GLOBE_COUNTRIES);
}

/**
 * Add or remove one code. The caller passes the *resolved* active set, so
 * removing a country while on the implicit top-N writes the materialised
 * top-N minus that country. Never grows past the cap.
 */
export function toggleCountry(active: string[], code: string): string[] {
  if (active.includes(code)) return active.filter((c) => c !== code);
  if (active.length >= MAX_GLOBE_COUNTRIES) return active;
  return [...active, code];
}
