"use client";

/**
 * Absolutely-positioned label that follows the hovered/focused bar. Purely
 * visual — the bars themselves carry `aria-label`s, so this is `aria-hidden`.
 */
export function ChartTooltip({
  x,
  y,
  label,
  placement = "above",
}: {
  x: number;
  y: number;
  label: string;
  placement?: "above" | "below";
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute z-10 -translate-x-1/2 rounded-md border border-border bg-surface px-2 py-1 text-xs whitespace-nowrap shadow-sm ${
        placement === "above" ? "-translate-y-full" : "translate-y-2"
      }`}
      style={{ left: x, top: y }}
    >
      {label}
    </div>
  );
}
