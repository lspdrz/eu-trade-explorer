"use client";

import { useMemo } from "react";
import type { YearlyPartnerTotal } from "../../types";
import {
  MAX_PRODUCTS,
  deriveBounds,
  deriveYearRange,
} from "../../lib/chartSelectionParams";
import { useChartSelection } from "../hooks/useChartSelection";
import { CountryCombobox } from "./CountryCombobox";
import { ImportsChartPanel } from "./ImportsChartPanel";
import { ProductMultiSelect } from "./ProductMultiSelect";
import { YearRangeSlider } from "./YearRangeSlider";

/**
 * "Compare products" tab: one partner country, up to three products, a bar
 * per product. Renders the partner caption + its own pickers and reads the
 * URL selection itself; the shared chrome is the RSC's.
 */
export function FertilizerImportsProductsView({
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

  const allTotals = useMemo(
    () => totalsByProduct.flatMap((t) => t.totals),
    [totalsByProduct],
  );
  const { years } = useMemo(() => deriveBounds(allTotals), [allTotals]);
  const { fromYear, toYear } = deriveYearRange(selection, years);
  const partialYear = years.length ? years[years.length - 1] : undefined;

  const rows = totalsByProduct.flatMap(({ product, totals }) =>
    totals.map((t) => ({
      seriesKey: product,
      year: Number(t.year),
      tonnes: t.tonnes,
    })),
  );

  const partnerName =
    availablePartners.find((p) => p.code === partner)?.name ?? partner;

  return (
    <>
      <p className="mt-3 text-[0.9375rem] text-muted">
        {partner
          ? `Imports to the EU from ${partnerName}`
          : "Choose a partner country to compare products."}
      </p>

      <div className="mt-6 flex flex-wrap items-end gap-x-8 gap-y-4 border-b border-border pb-5">
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
    </>
  );
}
