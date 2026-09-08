"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useTransition } from "react";
import {
  type ChartSelection,
  type SelectionBounds,
  chartSelectionToParams,
  parseChartSelection,
} from "../utils/chartSelectionParams";

/**
 * The chart's selection, read from and written back to the URL.
 *
 * Country and year edits use history.replaceState — the whole product
 * dataset is already in memory, so there's nothing for the server to redo.
 * Product edits use router navigation, which re-runs the Server Component to
 * fetch the new product's data; isProductPending covers that round-trip.
 */
export function useChartSelection(bounds: SelectionBounds) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [isProductPending, startTransition] = useTransition();

  const selection = useMemo<ChartSelection>(
    () => parseChartSelection(new URLSearchParams(searchParams.toString()), bounds),
    [searchParams, bounds],
  );

  const hrefFor = useCallback(
    (next: ChartSelection) => {
      const query = chartSelectionToParams(next, bounds).toString();
      return query ? `${pathname}?${query}` : pathname;
    },
    [bounds, pathname],
  );

  const setPartnerCodes = useCallback(
    (partnerCodes: string[]) =>
      window.history.replaceState(null, "", hrefFor({ ...selection, partnerCodes })),
    [selection, hrefFor],
  );

  const setYearRange = useCallback(
    (fromYear: number, toYear: number) =>
      window.history.replaceState(null, "", hrefFor({ ...selection, fromYear, toYear })),
    [selection, hrefFor],
  );

  const setProduct = useCallback(
    (product: string) => {
      const href = hrefFor({ ...selection, product });
      startTransition(() => router.push(href));
    },
    [selection, hrefFor, router],
  );

  return { selection, setPartnerCodes, setYearRange, setProduct, isProductPending };
}
