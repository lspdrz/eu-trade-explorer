"use client";

import { useMemo, useState } from "react";
import type { GroupedSeriesPoint } from "../../types";
import { assignColorSlots } from "../utils/assignColorSlots";
import { selectGroupedSeries } from "../utils/selectGroupedSeries";
import { SERIES_COLORS } from "../utils/seriesColors";
import { ChartEmptyState } from "./ChartEmptyState";
import { ImportsBarChart } from "./ImportsBarChart";
import { ImportsDataTable } from "./ImportsDataTable";

/**
 * The chart area shared by both tabs: turns flat `rows` + the selected
 * `seriesKeys` into the grouped bar chart, its data table, and the
 * empty-state placeholder. Dimension-agnostic — a "series" is a partner or a
 * product; the caller supplies the words (`seriesLabel`, `ariaLabel`,
 * `emptyMessage`) and how to name a key (`nameFor`).
 */
export function ImportsChartPanel({
  rows,
  seriesKeys,
  nameFor,
  seriesLabel,
  colorMax,
  ariaLabel,
  emptyMessage,
  fromYear,
  toYear,
  partialYear,
}: {
  rows: GroupedSeriesPoint[];
  seriesKeys: string[];
  nameFor: (key: string) => string;
  seriesLabel: string;
  colorMax: number;
  /** Built with the joined series names once they're known. */
  ariaLabel: (names: string) => string;
  emptyMessage: string;
  fromYear: number;
  toYear: number;
  partialYear?: number;
}) {
  const series = useMemo(
    () => selectGroupedSeries(rows, { seriesKeys, fromYear, toYear }),
    [rows, seriesKeys, fromYear, toYear],
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
    name: nameFor(key),
    color: SERIES_COLORS[colorSlots[key] ?? 0],
  }));

  return (
    <div className="mt-8">
      {seriesMeta.length === 0 ? (
        <ChartEmptyState message={emptyMessage} />
      ) : (
        <>
          <ImportsBarChart
            series={series}
            seriesMeta={seriesMeta}
            ariaLabel={ariaLabel(seriesMeta.map((s) => s.name).join(", "))}
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
  );
}
