"use client";

import { useMemo } from "react";
import type { StackedSeriesPoint, YearlyPartnerTotal } from "@/features/trade-data/types";
import {
  MAX_PRODUCTS,
  MAX_YEAR_SPAN_MOBILE,
  deriveBounds,
  deriveYearRange,
} from "@/features/trade-data/lib/chartSelectionParams";
import { useChartSelection } from "@/features/trade-data/ui/hooks/useChartSelection";
import { useIsMobile } from "@/features/hooks/useIsMobile";
import { CountryCombobox } from "@/features/trade-data/ui/components/CountryCombobox";
import { ProductMultiSelect } from "@/features/components/ProductMultiSelect";
import { StackedChartPanel } from "@/features/trade-data/ui/components/StackedChartPanel";
import { YearRangeSlider } from "@/features/trade-data/ui/components/YearRangeSlider";

/**
 * "Compare countries" tab: up to 2 partner countries, up to 3 products, each
 * country's bar a stack of product segments (colour = product) with the
 * partner code under every bar. Reads the URL selection itself; the shared
 * chrome (heading, tabs) is the RSC's.
 */
export function FertilizerImportsCountryView({
  availableProducts,
  availablePartners,
  totalsByCountry,
}: {
  availableProducts: string[];
  availablePartners: { code: string; name: string }[];
  totalsByCountry: { product: string; totals: YearlyPartnerTotal[] }[];
}) {
  const { selection, setSelection, isPending } = useChartSelection();
  const isMobile = useIsMobile();
  const maxYearSpan = isMobile ? MAX_YEAR_SPAN_MOBILE : undefined;

  const allTotals = useMemo(
    () => totalsByCountry.flatMap((t) => t.totals),
    [totalsByCountry],
  );
  const { years } = useMemo(() => deriveBounds(allTotals), [allTotals]);
  const { fromYear, toYear } = deriveYearRange(selection, years, maxYearSpan);
  const partialYear = years.length ? years[years.length - 1] : undefined;

  const rows = useMemo<StackedSeriesPoint[]>(
    () =>
      totalsByCountry.flatMap(({ product, totals }) =>
        totals.map((t) => ({
          partnerCode: t.partnerCode,
          product,
          year: Number(t.year),
          tonnes: t.tonnes,
        })),
      ),
    [totalsByCountry],
  );

  const nameForCountry = (code: string) =>
    availablePartners.find((p) => p.code === code)?.name ?? code;

  return (
    // Chart first, controls below on mobile (flex-col-reverse — DOM order
    // unchanged, so tab order still reaches the controls before the chart);
    // back to controls-then-chart at md+, where there's room to see both
    // without scrolling past one to reach the other.
    <div className="flex flex-col-reverse md:flex-col">
      <div className="mt-6 flex flex-wrap items-end gap-x-8 gap-y-4 border-b border-border pb-5">
        <div className="min-w-[10rem] flex-1">
          <ProductMultiSelect
            products={availableProducts}
            value={selection.products}
            onChange={(products) => setSelection({ products })}
            max={MAX_PRODUCTS}
            pending={isPending}
          />
        </div>
        <div className="min-w-[10rem] flex-1">
          <CountryCombobox
            partners={availablePartners}
            value={selection.partnerCodes}
            onChange={(partnerCodes) =>
              setSelection({ partnerCodes }, { reRunServer: false })
            }
          />
        </div>
        {years.length > 1 && (
          <div className="min-w-[12rem] flex-1">
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
          </div>
        )}
      </div>

      <StackedChartPanel
        rows={rows}
        partnerCodes={selection.partnerCodes}
        products={selection.products}
        nameForCountry={nameForCountry}
        ariaLabel={(names) =>
          `EU imports in tonnes per year for ${names}, by partner country`
        }
        fromYear={fromYear}
        toYear={toYear}
        partialYear={partialYear}
      />
    </div>
  );
}
