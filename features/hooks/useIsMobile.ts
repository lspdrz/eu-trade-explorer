"use client";

import { useSyncExternalStore } from "react";

function subscribe(breakpointPx: number, onChange: () => void): () => void {
  const mql = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/**
 * True when the viewport is narrower than `breakpointPx` (default 640,
 * Tailwind's `sm`). False during SSR and the initial client snapshot before
 * hydration settles.
 */
export function useIsMobile(breakpointPx = 640): boolean {
  return useSyncExternalStore(
    (onChange) => subscribe(breakpointPx, onChange),
    () => window.matchMedia(`(max-width: ${breakpointPx - 1}px)`).matches,
    () => false,
  );
}
