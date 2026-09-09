"use client";

import { useMemo, useState } from "react";
import type { TradeSource, YearlyPartnerTotal } from "../../types";
import { assignColorSlots } from "../utils/assignColorSlots";
import { MAX_COUNTRIES, deriveBounds } from "../utils/chartSelectionParams";
import { selectGroupedSeries } from "../utils/selectGroupedSeries";
import { useChartSelection } from "../hooks/useChartSelection";
import { ChartEmptyState } from "./ChartEmptyState";
import { CountryCombobox } from "./CountryCombobox";
import { ImportsBarChart } from "./ImportsBarChart";
import { ImportsDataTable } from "./ImportsDataTable";
import { ProductListbox } from "./ProductListbox";
import { SourceToggle } from "./SourceToggle";
import { YearRangeSlider } from "./YearRangeSlider";

const SERIES_COLORS = [
  "var(--color-series-1)",
  "var(--color-series-2)",
  "var(--color-series-3)",
];

export function FertilizerImportsView({
  source,
  products,
  product,
  yearlyTotals,
}: {
  source: TradeSource;
  products: string[];
  product: string;
  yearlyTotals: YearlyPartnerTotal[];
}) {
  const bounds = useMemo(
    () => ({ products, ...deriveBounds(yearlyTotals) }),
    [products, yearlyTotals],
  );
  const { selection, setPartnerCodes, setYearRange, setProduct, setSource, isPending } =
    useChartSelection(bounds);

  // The `source` and `product` server props are authoritative for the
  // selectors' values: during a change the URL (hence `selection.*`) can lag
  // one render behind `router.push`, but the RSC has already refetched for
  // the new source/product.

  const rows = useMemo(
    () =>
      yearlyTotals.map((t) => ({
        seriesKey: t.partnerCode,
        year: Number(t.year),
        tonnes: t.tonnes,
      })),
    [yearlyTotals],
  );
  const series = useMemo(
    () =>
      selectGroupedSeries(rows, {
        seriesKeys: selection.partnerCodes,
        fromYear: selection.fromYear,
        toYear: selection.toYear,
      }),
    [rows, selection.partnerCodes, selection.fromYear, selection.toYear],
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
    setColorSlots((prev) =>
      assignColorSlots(selection.partnerCodes, prev, MAX_COUNTRIES),
    );
  }

  const seriesMeta = selection.partnerCodes.map((code) => ({
    key: code,
    name: bounds.partners.find((p) => p.code === code)?.name ?? code,
    color: SERIES_COLORS[colorSlots[code] ?? 0],
  }));

  const [minYear, maxYear] = bounds.years.length
    ? [bounds.years[0], bounds.years[bounds.years.length - 1]]
    : [0, 0];
  const partialYear = bounds.years.length ? maxYear : undefined;

  const ariaLabel = `EU imports in tonnes per year for ${seriesMeta
    .map((s) => s.name)
    .join(", ")}`;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="max-w-[34rem]">
        <h1 className="text-[1.75rem] leading-[1.15] font-semibold tracking-[-0.01em]">
          Where the EU&rsquo;s fertilizer comes from
        </h1>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">
          Import volumes by partner country. Choose a source and product, and up
          to three partners to compare across the years on record.
        </p>
      </header>

      <div className="mt-8 flex flex-wrap items-end gap-x-8 gap-y-4 border-b border-border pb-5">
        <SourceToggle value={source} onChange={setSource} pending={isPending} />
        <ProductListbox
          products={bounds.products}
          value={product}
          onChange={setProduct}
          pending={isPending}
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
        {seriesMeta.length === 0 ? (
          <ChartEmptyState message="Choose up to three partner countries to see the comparison." />
        ) : (
          <>
            <ImportsBarChart
              series={series}
              seriesMeta={seriesMeta}
              ariaLabel={ariaLabel}
              partialYear={partialYear}
            />
            <ImportsDataTable
              series={series}
              seriesMeta={seriesMeta}
              seriesLabel="Country"
              partialYear={partialYear}
            />
          </>
        )}
      </div>
    </main>
  );
}
