"use client";

import type { YearlyPartnerTotal } from "@/features/trade-data/types";
import {
  MAX_PRODUCTS,
  deriveBounds,
  deriveYearRange,
} from "@/features/trade-data/lib/chartSelectionParams";
import { useChartSelection } from "@/features/trade-data/ui/hooks/useChartSelection";
import { ImportsChartPanel } from "@/features/trade-data/ui/components/ImportsChartPanel";

/**
 * "Compare products" tab's chart: one partner country, up to three
 * products, a bar per product. Renders the partner's chart only — the
 * controls row lives in the sidebar (ProductsViewControls) and the
 * shared chrome is the RSC's.
 */
export function FertilizerImportsProductsView({
  availablePartners,
  partner,
  totalsByProduct,
}: {
  availablePartners: { code: string; name: string }[];
  /** Authoritative during a refetch ("" = none picked yet). */
  partner: string;
  totalsByProduct: { product: string; totals: YearlyPartnerTotal[] }[];
}) {
  const { selection } = useChartSelection();

  const allTotals = totalsByProduct.flatMap((t) => t.totals);
  const { years } = deriveBounds(allTotals);
  const { fromYear, toYear } = deriveYearRange(selection, years);
  const partialYear = years.length ? years[years.length - 1] : undefined;

  const rows = totalsByProduct.flatMap(({ product, totals }) =>
    totals.map((t) => ({
      seriesKey: product,
      year: Number(t.year),
      tonnes: t.tonnes,
    })),
  );

  const partnerName =
    availablePartners.find((p) => p.code === partner)?.name ?? partner;

  return (
    <ImportsChartPanel
      rows={rows}
      seriesKeys={selection.products}
      nameFor={(key) => key}
      seriesLabel="Product"
      colorMax={MAX_PRODUCTS}
      ariaLabel={(names) =>
        partner
          ? `${partnerName}'s EU imports in tonnes per year for ${names}`
          : `EU imports in tonnes per year for ${names}`
      }
      emptyMessage={
        partner
          ? "Choose one or more products to compare."
          : "Choose a partner country to compare products."
      }
      fromYear={fromYear}
      toYear={toYear}
      partialYear={partialYear}
    />
  );
}
