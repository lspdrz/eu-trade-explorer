"use client";

import { Slider } from "radix-ui";
import { useState } from "react";

/**
 * Caps `[a, b]` (`b` assumed >= `a`, as Radix's slider itself enforces via
 * `minStepsBetweenThumbs`) to at most `maxSpan` apart. `prevA` is the
 * pre-drag value of `a`, used to tell which thumb just moved: whichever one
 * *didn't* gets pushed along to hold the span, rather than letting the
 * moving thumb drag straight through it. A pure function (not a component
 * closure) so the clamping math is unit-testable without simulating a
 * pointer drag against Radix's slider — this codebase's tests only render
 * static markup, with no interactive-component testing set up.
 */
export function clampToMaxSpan(
  a: number,
  b: number,
  prevA: number,
  maxSpan: number | undefined,
): [number, number] {
  if (maxSpan === undefined || b - a <= maxSpan) return [a, b];
  return a !== prevA ? [a, a + maxSpan] : [b - maxSpan, b];
}

/**
 * Dual-handle year range. Drags update a local value for responsiveness; only
 * the committed value (on release) is pushed upstream to the URL.
 *
 * `maxSpan`, when given, caps how far apart the two thumbs can be dragged —
 * see `clampToMaxSpan` above.
 */
export function YearRangeSlider({
  minYear,
  maxYear,
  from,
  to,
  onCommit,
  maxSpan,
}: {
  minYear: number;
  maxYear: number;
  from: number;
  to: number;
  onCommit: (from: number, to: number) => void;
  maxSpan?: number;
}) {
  // Local state so the label tracks the drag; committed value (on release)
  // flows to the URL upstream. Re-sync from props during render — not an
  // effect — when the committed range changes (React's "storing info from
  // previous renders" pattern).
  const [local, setLocal] = useState<[number, number]>([from, to]);
  const [committed, setCommitted] = useState<[number, number]>([from, to]);
  if (committed[0] !== from || committed[1] !== to) {
    setCommitted([from, to]);
    setLocal([from, to]);
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-[0.8125rem] font-medium text-muted">
        Years: <span className="tabular-nums">{local[0]}–{local[1]}</span>
      </label>
      <Slider.Root
        className="relative flex h-5 w-full min-w-40 touch-none items-center select-none"
        min={minYear}
        max={maxYear}
        step={1}
        minStepsBetweenThumbs={1}
        value={local}
        onValueChange={([a, b]) => setLocal(clampToMaxSpan(a, b, local[0], maxSpan))}
        onValueCommit={([a, b]) => onCommit(...clampToMaxSpan(a, b, local[0], maxSpan))}
      >
        <Slider.Track className="relative h-1 grow rounded-full bg-border">
          <Slider.Range className="absolute h-full rounded-full bg-foreground" />
        </Slider.Track>
        <Slider.Thumb
          aria-label="From year"
          className="block h-4 w-4 rounded-full border border-border bg-surface shadow focus-visible:ring-2 focus-visible:ring-foreground focus-visible:outline-none"
        />
        <Slider.Thumb
          aria-label="To year"
          className="block h-4 w-4 rounded-full border border-border bg-surface shadow focus-visible:ring-2 focus-visible:ring-foreground focus-visible:outline-none"
        />
      </Slider.Root>
      <div className="flex w-full justify-between text-[11px] text-muted tabular-nums">
        <span>{minYear}</span>
        <span>{maxYear}</span>
      </div>
    </div>
  );
}
