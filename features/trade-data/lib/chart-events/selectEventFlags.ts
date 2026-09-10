import type { ChartEvent } from "@/features/trade-data/types";
import { eventX } from "@/features/trade-data/lib/chart-events/chartEvents";
import { FLAG_ROW_H, layoutEventFlags, type FlagPlacement } from "@/features/trade-data/lib/chart-events/layoutEventFlags";

/**
 * The chart's event layer, ready to render: given the store state and the
 * chart's x geometry, filter events to the visible years, lay out their
 * flags, and size the band they occupy above the plot. Pure — both charts
 * call this with their own scale. Returns an empty layer when the layer is
 * off or nothing falls in range.
 */
export function selectEventFlags(input: {
  enabled: boolean;
  events: ChartEvent[];
  years: number[];
  x0: (year: number) => number | undefined;
  bandwidth: number;
  marginLeft: number;
  width: number;
}): { placements: FlagPlacement[]; flagBandHeight: number } {
  const { enabled, events, years, x0, bandwidth, marginLeft, width } = input;

  const first = years[0];
  const last = years[years.length - 1];
  if (!enabled || first === undefined) {
    return { placements: [], flagBandHeight: 0 };
  }

  const visible = events.filter((e) => e.year >= first && e.year <= last);
  if (visible.length === 0) return { placements: [], flagBandHeight: 0 };

  const { placements, rowCount } = layoutEventFlags(
    visible,
    (e) => eventX(e.year, e.month, x0, bandwidth, marginLeft) ?? 0,
    width,
  );
  return { placements, flagBandHeight: rowCount * FLAG_ROW_H };
}
