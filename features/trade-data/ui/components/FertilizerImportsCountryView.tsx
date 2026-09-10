"use client";

import { useMemo } from "react";
import type { StackedSeriesPoint, YearlyPartnerTotal } from "../../types";
import {
  MAX_PRODUCTS,
  deriveBounds,
  deriveYearRange,
} from "../../lib/chartSelectionParams";
import { useChartSelection } from "../hooks/useChartSelection";
import { CountryCombobox } from "./CountryCombobox";
import { ProductMultiSelect } from "./ProductMultiSelect";
import { StackedChartPanel } from "./StackedChartPanel";
import { YearRangeSlider } from "./YearRangeSlider";

/**
 * "Compare countries" tab: up to 3 partner countries, up to 3 products, each
 * country's bar a stack of product segments (colour = product) with the
 * partner code under every bar. Reads the URL selection itself; the shared
 * chrome (heading, source toggle, tabs) is the RSC's.
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

  const allTotals = useMemo(
    () => totalsByCountry.flatMap((t) => t.totals),
    [totalsByCountry],
  );
  const { years } = useMemo(() => deriveBounds(allTotals), [allTotals]);
  const { fromYear, toYear } = deriveYearRange(selection, years);
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
    <>
      <div className="mt-6 flex flex-wrap items-end gap-x-8 gap-y-4 border-b border-border pb-5">
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
          />
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
    </>
  );
}
