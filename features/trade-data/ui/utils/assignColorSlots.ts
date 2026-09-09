/**
 * Stable colour assignment for the selected series. A series keeps its colour
 * slot for as long as it stays selected — removing one never recolours the
 * others (the design's "colour follows the slot, not the position" rule). New
 * series take the lowest free slot, up to `max`.
 */
export function assignColorSlots(
  keys: string[],
  previous: Record<string, number>,
  max: number,
): Record<string, number> {
  const next: Record<string, number> = {};
  const used = new Set<number>();

  for (const key of keys) {
    const prior = previous[key];
    if (prior !== undefined && !used.has(prior)) {
      next[key] = prior;
      used.add(prior);
    }
  }

  for (const key of keys) {
    if (next[key] !== undefined) continue;
    let slot = 0;
    while (used.has(slot) && slot < max) slot++;
    next[key] = slot;
    used.add(slot);
  }

  return next;
}
