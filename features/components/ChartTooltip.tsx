"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

const SIDE_GAP = 10;

/**
 * Absolutely-positioned label that follows the hovered/focused mark.
 * Purely visual — hovered marks carry their own `aria-label`s, so this is
 * `aria-hidden`. Pass `label` for a single string (the original bar-hover
 * use case); pass `children` for richer content (e.g. RuTimelineChart's
 * multi-series readout) — `whitespace-nowrap` only applies to the plain
 * `label` path, since multi-row children manage their own layout.
 *
 * `hAlign="center"` (default, bar-hover charts): centers on `x`. When
 * `containerWidth` is given, measures its own rendered width and flips to
 * display fully left or right of `x` instead, so it stays within
 * [0, containerWidth] rather than getting clipped by a hovered mark near
 * either edge.
 *
 * `hAlign="side"` (line charts, e.g. RuTimelineChart): never sits on top of
 * `x` — it renders `SIDE_GAP` px clear of it, on whichever side of
 * `containerWidth`'s midpoint `x` isn't on, so the hovered crosshair's
 * lines stay visible underneath. The resulting box position is then
 * clamped into [0, containerWidth] using its real measured width, so a
 * tooltip wider than the room on its preferred side still stays fully
 * on-screen rather than overflowing the container.
 */
export function ChartTooltip({
  x,
  y,
  label,
  children,
  placement = "above",
  containerWidth,
  hAlign = "center",
}: {
  x: number;
  y: number;
  label?: string;
  children?: ReactNode;
  placement?: "above" | "below";
  containerWidth?: number;
  hAlign?: "center" | "side";
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [centerFlip, setCenterFlip] = useState<"center" | "displayLeft" | "displayRight">("center");
  const [sideLeft, setSideLeft] = useState(x + SIDE_GAP);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const width = ref.current.offsetWidth;

    if (hAlign === "side") {
      const preferRight = containerWidth === undefined || x <= containerWidth / 2;
      let boxLeft = preferRight ? x + SIDE_GAP : x - SIDE_GAP - width;
      if (containerWidth !== undefined) {
        const maxLeft = Math.max(0, containerWidth - width);
        boxLeft = Math.min(Math.max(boxLeft, 0), maxLeft);
      }
      setSideLeft(boxLeft);
      return;
    }

    if (containerWidth === undefined) return;
    if (x + width / 2 > containerWidth) setCenterFlip("displayLeft");
    else if (x - width / 2 < 0) setCenterFlip("displayRight");
    else setCenterFlip("center");
  }, [x, containerWidth, hAlign]);

  const left = hAlign === "side" ? sideLeft : x;
  const horizontalClass =
    hAlign === "side"
      ? "translate-x-0"
      : centerFlip === "displayLeft"
        ? "-translate-x-full"
        : centerFlip === "displayRight"
          ? "translate-x-0"
          : "-translate-x-1/2";

  return (
    <div
      ref={ref}
      aria-hidden
      className={`pointer-events-none absolute z-10 ${horizontalClass} rounded-md border border-border bg-surface/30 backdrop-blur-sm px-2 py-1 text-xs shadow-sm ${
        children ? "" : "whitespace-nowrap"
      } ${placement === "above" ? "-translate-y-full" : "translate-y-2"}`}
      style={{ left, top: y }}
    >
      {children ?? label}
    </div>
  );
}
