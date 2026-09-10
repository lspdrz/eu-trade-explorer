"use client";

import { useMemo } from "react";
import type { YearlyPartnerTotal } from "../../types";
import {
  MAX_COUNTRIES,
  deriveBounds,
  deriveYearRange,
} from "../utils/chartSelectionParams";
import { useChartSelection } from "../hooks/useChartSelection";
import { CountryCombobox } from "./CountryCombobox";
import { ImportsChartPanel } from "./ImportsChartPanel";
import { ProductListbox } from "./ProductListbox";
import { YearRangeSlider } from "./YearRangeSlider";

/**
 * "Compare countries" tab: one product, up to three partner countries, a bar
 * per partner. Renders its own pickers and reads the URL selection itself;
 * the shared chrome (heading, source toggle, tabs) is the RSC's.
 */
export function FertilizerImportsCountryView({
  availableProducts,
  availablePartners,
  product,
  totalsByCountry,
}: {
  availableProducts: string[];
  availablePartners: { code: string; name: string }[];
  /** Authoritative during a refetch (the URL lags one render). */
  product: string;
  totalsByCountry: YearlyPartnerTotal[];
}) {
  const { selection, setSelection, isPending } = useChartSelection();

  const { years } = useMemo(
    () => deriveBounds(totalsByCountry),
    [totalsByCountry],
  );
  const { fromYear, toYear } = deriveYearRange(selection, years);
  const partialYear = years.length ? years[years.length - 1] : undefined;

  const rows = totalsByCountry.map((t) => ({
    seriesKey: t.partnerCode,
    year: Number(t.year),
    tonnes: t.tonnes,
  }));

  const nameFor = (code: string) =>
    availablePartners.find((p) => p.code === code)?.name ?? code;

  return (
    <>
      <div className="mt-6 flex flex-wrap items-end gap-x-8 gap-y-4 border-b border-border pb-5">
        <ProductListbox
          products={availableProducts}
          value={selection.products[0] ?? product}
          onChange={(next) => setSelection({ products: [next] })}
          pending={isPending}
        />
        <CountryCombobox
          partners={availablePartners}
          value={selection.partnerCodes}
          onChange={(partnerCodes) => setSelection({ partnerCodes }, { reRunServer: false })}
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

      <ImportsChartPanel
        rows={rows}
        seriesKeys={selection.partnerCodes}
        nameFor={nameFor}
        seriesLabel="Country"
        colorMax={MAX_COUNTRIES}
        ariaLabel={(names) => `EU imports in tonnes per year for ${names}`}
        emptyMessage="Choose up to three partner countries to see the comparison."
        fromYear={fromYear}
        toYear={toYear}
        partialYear={partialYear}
      />
    </>
  );
}
