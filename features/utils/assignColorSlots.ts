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

  let recycleCursor = 0;
  for (const key of keys) {
    if (next[key] !== undefined) continue;
    let slot = 0;
    while (slot < max && used.has(slot)) slot++;
    if (slot >= max) {
      // Every slot is already taken — more keys than `max`, which callers
      // are expected not to let happen, but this must still return an
      // in-range slot rather than `max` (one past the last valid index,
      // pointing at nothing in a fixed-size color array). Recycle slots
      // round-robin instead of piling every overflow key onto the same
      // one, so collisions spread across all colors rather than
      // concentrating on a single slot.
      slot = recycleCursor % max;
      recycleCursor++;
    }
    next[key] = slot;
    used.add(slot);
  }

  return next;
}
