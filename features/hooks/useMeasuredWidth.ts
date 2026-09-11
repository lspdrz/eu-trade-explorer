"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The rendered width of a wrapper element, tracked with a ResizeObserver.
 * Pass an explicit `widthProp` to opt out (tests pass a fixed width) —
 * until the observer fires once (or if ResizeObserver isn't available),
 * `defaultWidth` is used instead. Attach the returned `ref` to the element
 * whose width should drive the chart.
 */
export function useMeasuredWidth(widthProp: number | undefined, defaultWidth: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState(widthProp ?? defaultWidth);

  useEffect(() => {
    if (widthProp !== undefined) return;
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setMeasured(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [widthProp]);

  return { ref, width: widthProp ?? measured };
}
