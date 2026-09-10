"use client";

import { useEffect, useRef, useState } from "react";

const DEFAULT_WIDTH = 960;

/**
 * The rendered width of a wrapper element, tracked with a ResizeObserver.
 * Pass an explicit `widthProp` to opt out (tests pass a fixed width). Attach
 * the returned `ref` to the element whose width should drive the chart.
 */
export function useMeasuredWidth(widthProp?: number, fallback = DEFAULT_WIDTH) {
  const ref = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState(widthProp ?? fallback);

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
