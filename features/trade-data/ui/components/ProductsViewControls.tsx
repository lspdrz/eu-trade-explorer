"use client";

import type { YearlyPartnerTotal } from "@/features/trade-data/types";
import {
  MAX_PRODUCTS,
  deriveBounds,
  deriveYearRange,
} from "@/features/trade-data/lib/chartSelectionParams";
import { useChartSelection } from "@/features/trade-data/ui/hooks/useChartSelection";
import { CountryCombobox } from "@/features/trade-data/ui/components/CountryCombobox";
import { ProductMultiSelect } from "@/features/components/ProductMultiSelect";
import { YearRangeSlider } from "@/features/trade-data/ui/components/YearRangeSlider";

/**
 * "Compare products" tab's controls — single partner picker, product
 * picker, year-range slider. Lives in the page's sidebar column, above
 * EventsPanel; reads/writes the URL selection itself (useChartSelection).
 */
export function ProductsViewControls({
  availableProducts,
  availablePartners,
  partner,
  totalsByProduct,
}: {
  availableProducts: string[];
  availablePartners: { code: string; name: string }[];
  /** Authoritative during a refetch ("" = none picked yet). */
  partner: string;
  totalsByProduct: { product: string; totals: YearlyPartnerTotal[] }[];
}) {
  const { selection, setSelection, isPending } = useChartSelection();

  const allTotals = totalsByProduct.flatMap((t) => t.totals);
  const { years } = deriveBounds(allTotals);
  const { fromYear, toYear } = deriveYearRange(selection, years);

  return (
    <div className="flex flex-col gap-4 border-b border-border pb-6">
      <CountryCombobox
        partners={availablePartners}
        value={partner ? [partner] : []}
        onChange={(codes) => setSelection({ partner: codes[0] ?? "" })}
        max={1}
        label="Partner"
      />
      <ProductMultiSelect
        products={availableProducts}
        value={selection.products}
        onChange={(products) => setSelection({ products }, { reRunServer: false })}
        max={MAX_PRODUCTS}
        pending={isPending}
      />
      {years.length > 1 && (
        <YearRangeSlider
          minYear={years[0]}
          maxYear={years[years.length - 1]}
          from={fromYear}
          to={toYear}
          onCommit={(from, to) =>
            setSelection({ fromYear: from, toYear: to }, { reRunServer: false })
          }
        />
      )}
    </div>
  );
}
