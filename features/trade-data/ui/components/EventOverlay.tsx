"use client";

import type { FlagPlacement } from "../utils/layoutEventFlags";
import { FLAG_ROW_H } from "../utils/layoutEventFlags";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * The event layer: a thin vertical rule per event and a dated flag label at
 * the top, laid out by `layoutEventFlags`. An absolutely-positioned HTML
 * sibling of the chart's <svg>, in the same measured-pixel space as
 * ChartTooltip. Renders nothing when the layer is off / empty (the caller
 * passes `placements: []`).
 */
export function EventOverlay({
  placements,
  flagBandHeight,
  plotHeight,
}: {
  placements: FlagPlacement[];
  flagBandHeight: number;
  plotHeight: number;
}) {
  if (placements.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0">
      {placements.map(({ event, x }) => (
        <div
          key={`rule-${event.id}`}
          data-event-rule
          className="absolute w-px"
          style={{
            left: x,
            top: flagBandHeight,
            height: plotHeight,
            backgroundColor: "var(--color-foreground)",
            opacity: 0.3,
          }}
        />
      ))}
      {placements.map(({ event, left, row }) => (
        <div
          key={`flag-${event.id}`}
          data-event-flag
          title={event.label}
          className="pointer-events-auto absolute flex max-w-[15rem] items-baseline gap-1 rounded bg-foreground px-1.5 py-0.5 text-[11px] text-background"
          style={{ left, top: row * FLAG_ROW_H }}
        >
          <span className="font-medium whitespace-nowrap tabular-nums">
            {MONTHS[event.month - 1]} {event.year}
          </span>
          <span aria-hidden>&ndash;</span>
          <span className="truncate">{event.label}</span>
        </div>
      ))}
    </div>
  );
}
