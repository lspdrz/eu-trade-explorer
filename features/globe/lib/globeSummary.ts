import { format } from "d3-format";
import type { PartnerImportTotal } from "@/features/globe/types";

const millions = format(".1f");

/**
 * The canvas's `aria-label`: what a screen-reader user gets in place of
 * the picture. Names the active count and the three biggest active
 * origins (by tonnage, not selection order), then points at the control.
 */
export function buildGlobeSummary(
  totals: PartnerImportTotal[],
  activeCodes: string[],
): string {
  const active = new Set(activeCodes);
  const shown = totals.filter((t) => active.has(t.partnerCode));
  const head = `Interactive globe of EU fertilizer imports. ${shown.length} origin countries.`;
  const largest = shown
    .slice(0, 3)
    .map((t) => `${t.partner}, ${millions(t.tonnes / 1_000_000)} million tonnes`)
    .join("; ");
  const body = largest ? ` Largest: ${largest}.` : "";
  return `${head}${body} Drag to rotate; use the country list to change the selection.`;
}
