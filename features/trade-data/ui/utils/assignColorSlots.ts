import { MAX_COUNTRIES } from "./chartSelectionParams";

/**
 * Stable colour assignment for the selected countries. A country keeps its
 * colour slot for as long as it stays selected — removing one country never
 * recolours the others (the design's "colour follows the slot, not the
 * position" rule). New countries take the lowest free slot.
 */
export function assignColorSlots(
  partnerCodes: string[],
  previous: Record<string, number>,
): Record<string, number> {
  const next: Record<string, number> = {};
  const used = new Set<number>();

  for (const code of partnerCodes) {
    const prior = previous[code];
    if (prior !== undefined && !used.has(prior)) {
      next[code] = prior;
      used.add(prior);
    }
  }

  for (const code of partnerCodes) {
    if (next[code] !== undefined) continue;
    let slot = 0;
    while (used.has(slot) && slot < MAX_COUNTRIES) slot++;
    next[code] = slot;
    used.add(slot);
  }

  return next;
}
