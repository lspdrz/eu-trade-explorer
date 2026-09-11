"use client";

import { useMemo, useState } from "react";
import type { SelectedSeries, StackedSeriesPoint } from "@/features/trade-data/types";
import { assignColorSlots } from "@/features/utils/assignColorSlots";
import { MAX_PRODUCTS } from "@/features/trade-data/lib/chartSelectionParams";
import { selectStackedSeries } from "@/features/trade-data/lib/selectStackedSeries";
import { SERIES_COLORS } from "@/features/trade-data/lib/seriesColors";
import { ChartEmptyState } from "@/features/trade-data/ui/components/ChartEmptyState";
import { StackedImportsChart } from "@/features/trade-data/ui/components/StackedImportsChart";
import { StackedImportsDataTable } from "@/features/trade-data/ui/components/StackedImportsDataTable";

/**
 * The stacked "Compare countries" chart area: flat (partner, product, year)
 * rows + the current selection in, chart + data table + empty state out.
 * Colour is keyed on product and stays stable while a product is selected.
 */
export function StackedChartPanel({
  rows,
  partnerCodes,
  products,
  nameForCountry,
  ariaLabel,
  fromYear,
  toYear,
  partialYear,
}: {
  rows: StackedSeriesPoint[];
  partnerCodes: string[];
  products: string[];
  nameForCountry: (code: string) => string;
  ariaLabel: (productNames: string) => string;
  fromYear: number;
  toYear: number;
  partialYear?: number;
}) {
  const series = useMemo(
    () => selectStackedSeries(rows, { partnerCodes, products, fromYear, toYear }),
    [rows, partnerCodes, products, fromYear, toYear],
  );

  // Stable colour slots: a product keeps its colour while selected. Recompute
  // during render (not in an effect) when the set changes.
  const keyStr = products.join(",");
  const [slotsKey, setSlotsKey] = useState("");
  const [colorSlots, setColorSlots] = useState<Record<string, number>>({});
  if (keyStr !== slotsKey) {
    setSlotsKey(keyStr);
    setColorSlots((prev) => assignColorSlots(products, prev, MAX_PRODUCTS));
  }

  const seriesMeta: SelectedSeries[] = products.map((p) => ({
    key: p,
    name: p,
    color: SERIES_COLORS[colorSlots[p] ?? 0],
  }));

  const message =
    partnerCodes.length === 0
      ? "Choose up to three partner countries to compare."
      : products.length === 0
        ? "Choose one or more products."
        : undefined;

  return (
    <div className="mt-8">
      {message ? (
        <ChartEmptyState message={message} />
      ) : (
        <>
          <StackedImportsChart
            series={series}
            seriesMeta={seriesMeta}
            nameForCountry={nameForCountry}
            ariaLabel={ariaLabel(seriesMeta.map((s) => s.name).join(", "))}
            partialYear={partialYear}
          />
          <StackedImportsDataTable
            series={series}
            seriesMeta={seriesMeta}
            nameForCountry={nameForCountry}
            partialYear={partialYear}
          />
        </>
      )}
    </div>
  );
}
