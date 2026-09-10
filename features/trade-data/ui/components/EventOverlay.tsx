"use client";

import { formatEventDate } from "../utils/chartEvents";
import type { FlagPlacement } from "../utils/layoutEventFlags";
import { FLAG_ROW_H } from "../utils/layoutEventFlags";

/** Approx flag box height (11px text + padding + border) — where its rule starts. */
const FLAG_H = 20;

/**
 * The event layer: a thin vertical rule per event and a dated flag label at
 * the top, laid out by `layoutEventFlags`. An absolutely-positioned HTML
 * sibling of the chart's <svg>, in the same measured-pixel space as
 * ChartTooltip. Renders nothing when the layer is off / empty (the caller
 * passes `placements: []`).
 */
export function EventOverlay({
  placements,
  plotTop,
  plotHeight,
}: {
  placements: FlagPlacement[];
  /** Wrapper px from the top to the plot's top edge (the chart's total top margin). */
  plotTop: number;
  plotHeight: number;
}) {
  if (placements.length === 0) return null;

  const baseline = plotTop + plotHeight;

  return (
    <div className="pointer-events-none absolute inset-0">
      {placements.map(({ event, x, row }) => {
        const ruleTop = row * FLAG_ROW_H + FLAG_H;
        return (
          <div
            key={`rule-${event.id}`}
            data-event-rule
            className="absolute w-px"
            style={{
              left: x,
              top: ruleTop,
              height: Math.max(0, baseline - ruleTop),
              backgroundColor: "var(--color-foreground)",
              opacity: 0.3,
            }}
          />
        );
      })}
      {placements.map(({ event, left, row }) => (
        <div
          key={`flag-${event.id}`}
          data-event-flag
          title={event.label}
          className="pointer-events-auto absolute flex max-w-[15rem] items-baseline gap-1 rounded border border-border bg-surface px-1.5 py-0.5 text-[11px] text-foreground shadow-sm"
          style={{ left, top: row * FLAG_ROW_H }}
        >
          <span className="font-medium whitespace-nowrap tabular-nums">
            {formatEventDate(event.year, event.month)}
          </span>
          <span aria-hidden>&ndash;</span>
          <span className="truncate">{event.label}</span>
        </div>
      ))}
    </div>
  );
}
