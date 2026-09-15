"use client";

import type { YearlyPartnerTotal } from "@/features/trade-data/types";
import {
  MAX_PRODUCTS,
  MAX_YEAR_SPAN_MOBILE,
  NARROW_CHART_BREAKPOINT,
  deriveBounds,
  deriveYearRange,
} from "@/features/trade-data/lib/chartSelectionParams";
import { useChartSelection } from "@/features/trade-data/ui/hooks/useChartSelection";
import { useIsMobile } from "@/features/hooks/useIsMobile";
import { CountryCombobox } from "@/features/trade-data/ui/components/CountryCombobox";
import { ProductMultiSelect } from "@/features/components/ProductMultiSelect";
import { YearRangeSlider } from "@/features/trade-data/ui/components/YearRangeSlider";

/**
 * "Compare countries" tab's controls — product picker, country picker,
 * year-range slider. Lives in the page's sidebar column, above
 * EventsPanel; reads/writes the URL selection itself (useChartSelection),
 * so it stays in sync with FertilizerImportsCountryView without either
 * one needing to know the other exists.
 */
export function CountryViewControls({
  availableProducts,
  availablePartners,
  totalsByCountry,
}: {
  availableProducts: string[];
  availablePartners: { code: string; name: string }[];
  totalsByCountry: { product: string; totals: YearlyPartnerTotal[] }[];
}) {
  const { selection, setSelection, isPending } = useChartSelection();
  const isNarrow = useIsMobile(NARROW_CHART_BREAKPOINT);
  const maxYearSpan = isNarrow ? MAX_YEAR_SPAN_MOBILE : undefined;

  const allTotals = totalsByCountry.flatMap((t) => t.totals);
  const { years } = deriveBounds(allTotals);
  const { fromYear, toYear } = deriveYearRange(selection, years, maxYearSpan);

  return (
    <div className="flex flex-col gap-4 border-b border-border pb-6">
      <ProductMultiSelect
        products={availableProducts}
        value={selection.products}
        onChange={(products) => setSelection({ products })}
        max={MAX_PRODUCTS}
        pending={isPending}
      />
      <CountryCombobox
        partners={availablePartners}
        value={selection.partnerCodes}
        onChange={(partnerCodes) =>
          setSelection({ partnerCodes }, { reRunServer: false })
        }
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
          maxSpan={maxYearSpan}
        />
      )}
    </div>
  );
}
