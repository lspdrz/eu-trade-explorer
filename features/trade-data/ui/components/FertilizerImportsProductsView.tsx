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
 *
 * Filters `totalsByProduct` to `selection.partner` itself rather than
 * trusting the caller to have already scoped it to one partner — the RSC
 * fetches every partner's totals for every product unconditionally now
 * (see ui/index.tsx), so this is the only place left that knows which
 * partner is actually selected.
 */
export function FertilizerImportsProductsView({
  availablePartners,
  totalsByProduct,
}: {
  availablePartners: { code: string; name: string }[];
  totalsByProduct: { product: string; totals: YearlyPartnerTotal[] }[];
}) {
  const { selection } = useChartSelection();
  const partner = selection.partner;

  const scoped = totalsByProduct.map(({ product, totals }) => ({
    product,
    totals: totals.filter((t) => t.partnerCode === partner),
  }));

  const allTotals = scoped.flatMap((t) => t.totals);
  const { years } = deriveBounds(allTotals);
  const { fromYear, toYear } = deriveYearRange(selection, years);
  const partialYear = years.length ? years[years.length - 1] : undefined;

  const rows = scoped.flatMap(({ product, totals }) =>
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
