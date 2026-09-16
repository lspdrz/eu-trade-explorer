"use client";

import type { YearlyPartnerTotal } from "@/features/trade-data/types";
import { useChartSelection } from "@/features/trade-data/ui/hooks/useChartSelection";
import { CountryViewControls } from "@/features/trade-data/ui/components/CountryViewControls";
import { ProductsViewControls } from "@/features/trade-data/ui/components/ProductsViewControls";

/** Same split as FertilizerImportsChart, for the sidebar's controls row. */
export function FertilizerImportsControls({
  availableProducts,
  availablePartners,
  allTotals,
}: {
  availableProducts: string[];
  availablePartners: { code: string; name: string }[];
  allTotals: { product: string; totals: YearlyPartnerTotal[] }[];
}) {
  const { selection } = useChartSelection();

  return selection.view === "countries" ? (
    <CountryViewControls
      availableProducts={availableProducts}
      availablePartners={availablePartners}
      totalsByCountry={allTotals}
    />
  ) : (
    <ProductsViewControls
      availableProducts={availableProducts}
      availablePartners={availablePartners}
      totalsByProduct={allTotals}
    />
  );
}
