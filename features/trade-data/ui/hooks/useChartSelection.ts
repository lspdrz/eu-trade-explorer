"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo, useSyncExternalStore, useTransition } from "react";
import type { ChartSelection } from "@/features/trade-data/types";
import { parseSelection, serializeSelection } from "@/features/trade-data/lib/chartSelectionParams";

type SetSelectionOptions = {
  /**
   * Whether this edit needs the RSC to re-fetch. `true` (default) navigates:
   * a new dataset is loaded, `isPending` covers the round-trip, and it adds a
   * history entry. `false` writes with history.replaceState — the URL and the
   * client re-render, but the server isn't touched. Use `false` only when the
   * data on screen already contains everything the edit could show (the
   * partner list and year range just re-filter what's in memory).
   */
  reRunServer?: boolean;
};

const SELECTION_CHANGE_EVENT = "trade-data:selection-change";

/**
 * Fires whenever this hook writes the URL via history.replaceState — raw
 * history.replaceState/pushState calls don't dispatch `popstate` the way
 * real back/forward navigation does, so without this, only the component
 * instance that called setSelection would ever see the change; every other
 * mounted useChartSelection() consumer would stay stale.
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
 * The chart's selection, read from the URL and written back with one
 * `setSelection(patch)`. The whole selection is re-serialised on every edit,
 * so there's no per-param surgery. `parseSelection` needs no data bounds, so
 * this is cheap to call in any component that needs the selection.
 *
 * Reads the URL via useSyncExternalStore instead of next/navigation's
 * useSearchParams() — using useSearchParams() at all, anywhere in a
 * statically-rendered page, bails that page's nearest Suspense boundary to
 * client-only rendering (documented Next.js behavior), which for this page
 * (see ui/index.tsx) means shipping zero server-rendered chart markup.
 * The server snapshot is the empty query string, which is exactly
 * parseSelection's own default selection — so the prerendered HTML already
 * shows the real default chart; only a non-default deep link corrects after
 * hydration. Same SSR-safe-snapshot pattern as useIsMobile.ts. Cross-
 * component sync on a same-tab, reRunServer:false write is carried by a
 * manually-dispatched event (see dispatchSelectionChange) since raw
 * history.replaceState doesn't fire popstate on its own.
 */
export function useChartSelection() {
  const search = useSyncExternalStore(subscribe, getClientSearch, getServerSearch);
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const selection = useMemo(
    () => parseSelection(new URLSearchParams(search)),
    [search],
  );

  const setSelection = useCallback(
    (patch: Partial<ChartSelection>, options?: SetSelectionOptions) => {
      const query = serializeSelection({ ...selection, ...patch }).toString();
      const href = query ? `${pathname}?${query}` : pathname;
      if (options?.reRunServer === false) {
        window.history.replaceState(null, "", href);
        dispatchSelectionChange();
      } else {
        startTransition(() => router.push(href));
      }
    },
    [selection, pathname, router],
  );

  return { selection, setSelection, isPending };
}
