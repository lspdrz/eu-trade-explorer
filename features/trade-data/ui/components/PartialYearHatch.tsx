"use client";

import { useId } from "react";

/** A DOM-safe pattern id (useId() contains colons, invalid in url(#…)). */
export function usePatternId(prefix: string): string {
  return `${prefix}-${useId().replace(/:/g, "")}`;
}

/**
 * The 45° hatch used to overlay a partial (still-recording) year's bars.
 * Render once per chart; reference it as fill={`url(#${id})`} and set the
 * element's CSS `color` to tint the strokes.
 */
export function PartialYearHatch({ id }: { id: string }) {
  return (
    <defs>
      <pattern
        id={id}
        patternUnits="userSpaceOnUse"
        width={6}
        height={6}
        patternTransform="rotate(45)"
      >
        <rect width={6} height={6} fill="transparent" />
        <line x1={0} y1={0} x2={0} y2={6} stroke="currentColor" strokeWidth={2} />
      </pattern>
    </defs>
  );
}
