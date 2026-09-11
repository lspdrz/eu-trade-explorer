"use client";

import type { ReactNode } from "react";

/**
 * Absolutely-positioned label that follows the hovered/focused mark.
 * Purely visual — hovered marks carry their own `aria-label`s, so this is
 * `aria-hidden`. Pass `label` for a single string (the original bar-hover
 * use case); pass `children` for richer content (e.g. RuTimelineChart's
 * multi-series readout) — `whitespace-nowrap` only applies to the plain
 * `label` path, since multi-row children manage their own layout.
 */
export function ChartTooltip({
  x,
  y,
  label,
  children,
  placement = "above",
}: {
  x: number;
  y: number;
  label?: string;
  children?: ReactNode;
  placement?: "above" | "below";
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute z-10 -translate-x-1/2 rounded-md border border-border bg-surface px-2 py-1 text-xs shadow-sm ${
        children ? "" : "whitespace-nowrap"
      } ${placement === "above" ? "-translate-y-full" : "translate-y-2"}`}
      style={{ left: x, top: y }}
    >
      {children ?? label}
    </div>
  );
}
