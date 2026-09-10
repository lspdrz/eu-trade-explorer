import type { ChartEvent } from "@/features/trade-data/types";
import { sortEvents } from "@/features/trade-data/lib/chart-events/chartEvents";

export const FLAG_ROW_H = 24; // flag (~17px) + a gap between stacked rows

const CHAR_PX = 6.5;
const FLAG_PAD = 14;
const MAX_FLAG_CHARS = 34; // "Mmm YYYY – " + a clipped label; matches the panel's max-w

export interface FlagPlacement {
  event: ChartEvent;
  /** The rule's position, in chart pixels. */
  x: number;
  /** The flag's left edge — `x`, clamped to keep the flag on canvas. */
  left: number;
  row: number;
}

function estWidth(event: ChartEvent): number {
  const text = `Mmm YYYY – ${event.label}`;
  return Math.min(text.length, MAX_FLAG_CHARS) * CHAR_PX + FLAG_PAD;
}

/**
 * Assigns each event a flag row so labels never overlap: sweep left to right,
 * drop into the lowest row whose last flag has cleared. The rule stays at the
 * true `x`; only the flag's `left` is clamped to keep it on canvas.
 */
export function layoutEventFlags(
  events: ChartEvent[],
  xFor: (e: ChartEvent) => number,
  width: number,
): { placements: FlagPlacement[]; rowCount: number } {
  const rowRightEdge: number[] = []; // last flag's right edge, per row
  const placements: FlagPlacement[] = [];

  for (const event of sortEvents(events)) {
    const x = xFor(event);
    const w = estWidth(event);
    const left = Math.max(0, Math.min(x, width - w));

    let row = rowRightEdge.findIndex((edge) => edge <= left);
    if (row === -1) row = rowRightEdge.length;
    rowRightEdge[row] = left + w;

    placements.push({ event, x, left, row });
  }

  return { placements, rowCount: rowRightEdge.length };
}
