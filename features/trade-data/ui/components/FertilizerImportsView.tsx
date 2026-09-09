"use client";

import { useMemo, useState } from "react";
import type { TradeSource, YearlyPartnerTotal } from "../../types";
import { assignColorSlots } from "../utils/assignColorSlots";
import {
  MAX_COUNTRIES,
  MAX_PRODUCTS,
  deriveBounds,
} from "../utils/chartSelectionParams";
import { selectGroupedSeries } from "../utils/selectGroupedSeries";
import { useChartSelection } from "../hooks/useChartSelection";
import { ChartEmptyState } from "./ChartEmptyState";
import { ChartTabs } from "./ChartTabs";
import { CountryCombobox } from "./CountryCombobox";
import { ImportsBarChart } from "./ImportsBarChart";
import { ImportsDataTable } from "./ImportsDataTable";
import { ProductListbox } from "./ProductListbox";
import { ProductMultiSelect } from "./ProductMultiSelect";
import { SourceToggle } from "./SourceToggle";
import { YearRangeSlider } from "./YearRangeSlider";

const SERIES_COLORS = [
  "var(--color-series-1)",
  "var(--color-series-2)",
  "var(--color-series-3)",
];

type CommonProps = {
  source: TradeSource;
  availableProducts: string[];
  availablePartners: { code: string; name: string }[];
};

type Props = CommonProps &
  (
    | {
        view: "countries";
        /** Authoritative selector value during a refetch. */
        product: string;
        totals: YearlyPartnerTotal[];
      }
    | {
        view: "products";
        /** Authoritative selector value during a refetch ("" = none). */
        partner: string;
        totalsByProduct: { product: string; totals: YearlyPartnerTotal[] }[];
      }
  );

export function FertilizerImportsView(props: Props) {
  const { source, availableProducts, availablePartners, view } = props;

  const fetchedTotals =
    view === "countries"
      ? props.totals
      : props.totalsByProduct.flatMap((t) => t.totals);

  const bounds = useMemo(
    () => ({
      products: availableProducts,
      partners: availablePartners,
      years: deriveBounds(fetchedTotals).years,
    }),
    [availableProducts, availablePartners, fetchedTotals],
  );

  const {
    selection,
    setPartnerCodes,
    setYearRange,
    setProduct,
    setSource,
    setView,
    setPartner,
    setProducts,
    isPending,
  } = useChartSelection(bounds);

  const partnerName = (code: string) =>
    availablePartners.find((p) => p.code === code)?.name ?? code;

  // Per-view: the flat rows to plot, which series to show, and the labels.
  const { rows, seriesKeys, seriesLabel, colorMax } =
    view === "countries"
      ? {
          rows: props.totals.map((t) => ({
            seriesKey: t.partnerCode,
            year: Number(t.year),
            tonnes: t.tonnes,
          })),
          seriesKeys: selection.partnerCodes,
          seriesLabel: "Country" as const,
          colorMax: MAX_COUNTRIES,
        }
      : {
          rows: props.totalsByProduct.flatMap(({ product, totals }) =>
            totals.map((t) => ({
              seriesKey: product,
              year: Number(t.year),
              tonnes: t.tonnes,
            })),
          ),
          seriesKeys: selection.products,
          seriesLabel: "Product" as const,
          colorMax: MAX_PRODUCTS,
        };

  const series = useMemo(
    () =>
      selectGroupedSeries(rows, {
        seriesKeys,
        fromYear: selection.fromYear,
        toYear: selection.toYear,
      }),
    [rows, seriesKeys, selection.fromYear, selection.toYear],
  );

  // Stable colour slots: a series keeps its colour while selected. Recompute
  // during render (not in an effect) when the set changes — React's "adjust
  // state during render" pattern.
  const keyStr = seriesKeys.join(",");
  const [slotsKey, setSlotsKey] = useState("");
  const [colorSlots, setColorSlots] = useState<Record<string, number>>({});
  if (keyStr !== slotsKey) {
    setSlotsKey(keyStr);
    setColorSlots((prev) => assignColorSlots(seriesKeys, prev, colorMax));
  }

  const seriesMeta = seriesKeys.map((key) => ({
    key,
    name: view === "countries" ? partnerName(key) : key,
    color: SERIES_COLORS[colorSlots[key] ?? 0],
  }));

  const [minYear, maxYear] = bounds.years.length
    ? [bounds.years[0], bounds.years[bounds.years.length - 1]]
    : [0, 0];
  const partialYear = bounds.years.length ? maxYear : undefined;

  const names = seriesMeta.map((s) => s.name).join(", ");
  const ariaLabel =
    view === "products" && props.partner
      ? `${partnerName(props.partner)}'s EU imports in tonnes per year for ${names}`
      : `EU imports in tonnes per year for ${names}`;

  const emptyMessage =
    view === "countries"
      ? "Choose up to three partner countries to see the comparison."
      : props.partner
        ? "Choose one or more products to compare."
        : "Choose a partner country to compare products.";

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="max-w-[34rem]">
        <h1 className="text-[1.75rem] leading-[1.15] font-semibold tracking-[-0.01em]">
          Where the EU&rsquo;s fertilizer comes from
        </h1>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">
          EU fertilizer import volumes, by partner country or by product,
          across the years on record.
        </p>
      </header>

      <div className="mt-8">
        <SourceToggle value={source} onChange={setSource} pending={isPending} />
      </div>

      <div className="mt-6">
        <ChartTabs view={view} onChange={setView} pending={isPending} />
      </div>

      {view === "products" && (
        <p className="mt-3 text-[0.9375rem] text-muted">
          {props.partner
            ? `Imports to the EU from ${partnerName(props.partner)}`
            : "Choose a partner country to compare products."}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-end gap-x-8 gap-y-4 border-b border-border pb-5">
        {view === "countries" ? (
          <>
            <ProductListbox
              products={bounds.products}
              value={props.product}
              onChange={setProduct}
              pending={isPending}
            />
            <CountryCombobox
              partners={bounds.partners}
              value={selection.partnerCodes}
              onChange={setPartnerCodes}
            />
          </>
        ) : (
          <>
            <CountryCombobox
              partners={bounds.partners}
              value={props.partner ? [props.partner] : []}
              onChange={(codes) => setPartner(codes[0] ?? "")}
              max={1}
              label="Partner"
            />
            <ProductMultiSelect
              products={bounds.products}
              value={selection.products}
              onChange={setProducts}
              max={MAX_PRODUCTS}
              pending={isPending}
            />
          </>
        )}
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
          <ChartEmptyState message={emptyMessage} />
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
              seriesLabel={seriesLabel}
              partialYear={partialYear}
            />
          </>
        )}
      </div>
    </main>
  );
}
