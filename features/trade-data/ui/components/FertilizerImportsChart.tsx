"use client";

import type { YearlyPartnerTotal } from "@/features/trade-data/types";
import { useChartSelection } from "@/features/trade-data/ui/hooks/useChartSelection";
import { FertilizerImportsCountryView } from "@/features/trade-data/ui/components/FertilizerImportsCountryView";
import { FertilizerImportsProductsView } from "@/features/trade-data/ui/components/FertilizerImportsProductsView";

/**
 * Picks which chart to render for the active tab. Split out of the RSC so
 * the RSC never has to read `?view=` itself — reading searchParams at all,
 * for any reason, opts a Server Component into per-request dynamic
 * rendering, which this page no longer needs now that it always fetches
 * every product for every partner up front (see ui/index.tsx).
 */
export function FertilizerImportsChart({
  availablePartners,
  allTotals,
}: {
  availablePartners: { code: string; name: string }[];
  allTotals: { product: string; totals: YearlyPartnerTotal[] }[];
}) {
  const { selection } = useChartSelection();

  return selection.view === "countries" ? (
    <FertilizerImportsCountryView
      availablePartners={availablePartners}
      totalsByCountry={allTotals}
    />
  ) : (
    <FertilizerImportsProductsView
      availablePartners={availablePartners}
      totalsByProduct={allTotals}
    />
  );
}
