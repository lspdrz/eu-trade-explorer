"use client";

import { useMemo } from "react";
import type { StackedSeriesPoint, YearlyPartnerTotal } from "@/features/trade-data/types";
import {
  MAX_YEAR_SPAN_MOBILE,
  NARROW_CHART_BREAKPOINT,
  deriveBounds,
  deriveYearRange,
} from "@/features/trade-data/lib/chartSelectionParams";
import { useChartSelection } from "@/features/trade-data/ui/hooks/useChartSelection";
import { useIsMobile } from "@/features/hooks/useIsMobile";
import { StackedChartPanel } from "@/features/trade-data/ui/components/StackedChartPanel";

/**
 * "Compare countries" tab's chart: up to 2 partner countries, up to 3
 * products, each country's bar a stack of product segments (colour =
 * product) with the partner code under every bar. Reads the URL
 * selection itself; the controls row lives in the sidebar
 * (CountryViewControls) and the shared chrome (heading, tabs) is the
 * RSC's.
 */
export function FertilizerImportsCountryView({
  availablePartners,
  totalsByCountry,
}: {
  availablePartners: { code: string; name: string }[];
  totalsByCountry: { product: string; totals: YearlyPartnerTotal[] }[];
}) {
  const { selection } = useChartSelection();
  const isNarrow = useIsMobile(NARROW_CHART_BREAKPOINT);
  const maxYearSpan = isNarrow ? MAX_YEAR_SPAN_MOBILE : undefined;

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
  );
}
