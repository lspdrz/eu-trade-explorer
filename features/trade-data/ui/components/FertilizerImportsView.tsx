"use client";

import { useMemo, useState } from "react";
import type { YearlyPartnerTotal } from "../../types";
import { assignColorSlots } from "../utils/assignColorSlots";
import { deriveBounds } from "../utils/chartSelectionParams";
import { selectGroupedSeries } from "../utils/selectGroupedSeries";
import { useChartSelection } from "../hooks/useChartSelection";
import { CountryCombobox } from "./CountryCombobox";
import { ImportsBarChart } from "./ImportsBarChart";
import { ProductListbox } from "./ProductListbox";
import { YearRangeSlider } from "./YearRangeSlider";

const SERIES_COLORS = [
  "var(--color-series-1)",
  "var(--color-series-2)",
  "var(--color-series-3)",
];

export function FertilizerImportsView({
  products,
  product,
  yearlyTotals,
}: {
  products: string[];
  product: string;
  yearlyTotals: YearlyPartnerTotal[];
}) {
  const bounds = useMemo(
    () => ({ products, ...deriveBounds(yearlyTotals) }),
    [products, yearlyTotals],
  );
  const { selection, setPartnerCodes, setYearRange, setProduct, isProductPending } =
    useChartSelection(bounds);

  // The `product` server prop is authoritative for the selector's value: during
  // a product change the URL (hence `selection.product`) can lag one render
  // behind `router.push`, but the RSC has already refetched for the new product.

  const series = useMemo(
    () =>
      selectGroupedSeries(yearlyTotals, {
        partnerCodes: selection.partnerCodes,
        fromYear: selection.fromYear,
        toYear: selection.toYear,
      }),
    [yearlyTotals, selection.partnerCodes, selection.fromYear, selection.toYear],
  );

  // Stable colour slots: a country keeps its colour while selected. Recompute
  // during render (not in an effect) when the selected set changes, feeding
  // the last assignment back in as the "previous" — React's "adjust state
  // during render" pattern.
  const codesKey = selection.partnerCodes.join(",");
  const [slotsKey, setSlotsKey] = useState("");
  const [colorSlots, setColorSlots] = useState<Record<string, number>>({});
  if (codesKey !== slotsKey) {
    setSlotsKey(codesKey);
    setColorSlots((prev) => assignColorSlots(selection.partnerCodes, prev));
  }

  const selectedCountries = selection.partnerCodes.map((code) => ({
    code,
    name: bounds.partners.find((p) => p.code === code)?.name ?? code,
    color: SERIES_COLORS[colorSlots[code] ?? 0],
  }));

  const [minYear, maxYear] = bounds.years.length
    ? [bounds.years[0], bounds.years[bounds.years.length - 1]]
    : [0, 0];
  const partialYear = bounds.years.length ? maxYear : undefined;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="max-w-[34rem]">
        <h1 className="text-[1.75rem] leading-[1.15] font-semibold tracking-[-0.01em]">
          Where the EU&rsquo;s nitrogen fertilizer comes from
        </h1>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">
          Customs-recorded import volumes by partner country. Choose a product and
          up to three partners to compare across the years on record.
        </p>
      </header>

      <div className="mt-8 flex flex-wrap items-end gap-x-8 gap-y-4 border-b border-border pb-5">
        <ProductListbox
          products={bounds.products}
          value={product}
          onChange={setProduct}
          pending={isProductPending}
        />
        <CountryCombobox
          partners={bounds.partners}
          value={selection.partnerCodes}
          onChange={setPartnerCodes}
        />
        {bounds.years.length > 1 && (
          <YearRangeSlider
            minYear={minYear}
            maxYear={maxYear}
            from={selection.fromYear}
            to={selection.toYear}
            onCommit={setYearRange}
          />
        )}
      </div>

      <div className="mt-8">
        <ImportsBarChart
          series={series}
          countries={selectedCountries}
          partialYear={partialYear}
        />
      </div>
    </main>
  );
}
