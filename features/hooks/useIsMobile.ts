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
 * hydration settles — for behavior that depends on viewport width, not just
 * styling, which CSS media queries alone can't drive (e.g. capping a
 * slider's draggable range). Uses useSyncExternalStore, not a
 * useState+useEffect setState pair, to subscribe to matchMedia without
 * triggering a synchronous cascading re-render on mount.
 */
export function useIsMobile(breakpointPx = 640): boolean {
  return useSyncExternalStore(
    (onChange) => subscribe(breakpointPx, onChange),
    () => window.matchMedia(`(max-width: ${breakpointPx - 1}px)`).matches,
    () => false,
  );
}
