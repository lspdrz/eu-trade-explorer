"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The rendered width of a wrapper element, tracked with a ResizeObserver.
 * Pass an explicit `widthProp` to opt out (tests pass a fixed width) —
 * until the observer fires once (or if ResizeObserver isn't available),
 * `defaultWidth` is used instead. Attach the returned `ref` to the element
 * whose width should drive the chart.
 *
 * `hasMeasured` is false only for that brief fallback-width window: true
 * once the real width is known (or immediately, for an explicit
 * `widthProp` or no ResizeObserver support). A caller whose geometry
 * depends on a one-time measurement at mount (e.g. a draw-in animation
 * that measures path length) should gate that measurement on it — sizing
 * against the fallback and then silently resizing to the real width a
 * moment later can desync an in-flight animation from the geometry it was
 * measured against.
 */
export function useMeasuredWidth(widthProp: number | undefined, defaultWidth: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState(widthProp ?? defaultWidth);
  const [hasMeasured, setHasMeasured] = useState(widthProp !== undefined);

  useEffect(() => {
    if (widthProp !== undefined) return;
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") {
      setHasMeasured(true);
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setMeasured(w);
      setHasMeasured(true);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [widthProp]);

  return { ref, width: widthProp ?? measured, hasMeasured };
}
