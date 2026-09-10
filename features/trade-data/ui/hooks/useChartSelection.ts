"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useTransition } from "react";
import type { ChartSelection } from "../../types";
import { parseSelection, serializeSelection } from "../../lib/chartSelectionParams";

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

/**
 * The chart's selection, read from the URL and written back with one
 * `setSelection(patch)`. The whole selection is re-serialised on every edit,
 * so there's no per-param surgery. `parseSelection` needs no data bounds, so
 * this is cheap to call in any component that needs the selection.
 */
export function useChartSelection() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const selection = useMemo(
    () => parseSelection(new URLSearchParams(params.toString())),
    [params],
  );

  const setSelection = useCallback(
    (patch: Partial<ChartSelection>, options?: SetSelectionOptions) => {
      const query = serializeSelection({ ...selection, ...patch }).toString();
      const href = query ? `${pathname}?${query}` : pathname;
      if (options?.reRunServer === false) {
        window.history.replaceState(null, "", href);
      } else {
        startTransition(() => router.push(href));
      }
    },
    [selection, pathname, router],
  );

  return { selection, setSelection, isPending };
}
