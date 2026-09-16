"use client";

import { usePathname } from "next/navigation";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  parseGlobeCountries,
  serializeGlobeCountries,
} from "@/features/globe/lib/globeParams";

const SELECTION_CHANGE_EVENT = "globe:selection-change";

/**
 * Fires whenever this hook writes the URL via history.replaceState — raw
 * history.replaceState/pushState calls don't dispatch `popstate` the way
 * real back/forward navigation does, so without this, GlobeView wouldn't
 * re-render to reflect its own write.
 */
function dispatchSelectionChange(): void {
  window.dispatchEvent(new Event(SELECTION_CHANGE_EVENT));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("popstate", onChange);
  window.addEventListener(SELECTION_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(SELECTION_CHANGE_EVENT, onChange);
  };
}

function getClientSearch(): string {
  return window.location.search;
}

function getServerSearch(): string {
  return "";
}

/**
 * The globe's `?countries=` selection, read from the URL and written back
 * with `setRequested(codes)`. Reads via useSyncExternalStore instead of
 * next/navigation's useSearchParams() — using useSearchParams() at all
 * requires a wrapping Suspense boundary (a hard Next.js rule) and would
 * bail that boundary to client-only rendering on a statically-rendered
 * page, the same issue trade-data's useChartSelection had. The server
 * snapshot is the empty query string — an absent `?countries=` already
 * means "the implicit top-N" (see resolveActive), so this is the page's
 * own real default, not a placeholder. Same SSR-safe-snapshot pattern as
 * useIsMobile.ts / useChartSelection.ts.
 */
export function useGlobeSelection() {
  const search = useSyncExternalStore(subscribe, getClientSearch, getServerSearch);
  const pathname = usePathname();

  const requested = useMemo(
    () => parseGlobeCountries(new URLSearchParams(search)),
    [search],
  );

  const setRequested = useCallback(
    (codes: string[]) => {
      const qs = serializeGlobeCountries(codes).toString();
      window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
      dispatchSelectionChange();
    },
    [pathname],
  );

  return { requested, setRequested };
}
