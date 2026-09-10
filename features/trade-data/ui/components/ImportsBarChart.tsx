"use client";

import { max } from "d3-array";
import { scaleBand, scaleLinear } from "d3-scale";
import { useMemo, useState } from "react";
import type { GroupedSeries, SelectedSeries } from "../../types";
import { formatInt, formatTonnes } from "../../lib/chartFormat";
import { selectEventFlags } from "../../lib/chart-events/selectEventFlags";
import { xAxisLabelStep } from "../../lib/xAxisLabelStep";
import { useChartEvents } from "../hooks/useChartEvents";
import { useMeasuredWidth } from "../hooks/useMeasuredWidth";
import { ChartLegend } from "./ChartLegend";
import { ChartTooltip } from "./ChartTooltip";
import { EventOverlay } from "./EventOverlay";
import { PartialYearHatch, usePatternId } from "./PartialYearHatch";

const MARGIN = { top: 16, right: 16, bottom: 40, left: 64 };
const DEFAULT_HEIGHT = 420;

/**
 * Grouped bar chart of yearly import tonnes per series. Dimension-agnostic —
 * a "series" is whatever the caller keyed by (a partner country, a product).
 * All wording lives with the caller: `ariaLabel` here, the empty state and
 * the "Show the numbers" table are separate (ChartEmptyState /
 * ImportsDataTable).
 */
export function ImportsBarChart({
  series,
  seriesMeta,
  ariaLabel,
  partialYear,
  width: widthProp,
  height = DEFAULT_HEIGHT,
}: {
  series: GroupedSeries;
  seriesMeta: SelectedSeries[];
  ariaLabel: string;
  partialYear?: number;
  width?: number;
  height?: number;
}) {
  const { ref: wrapRef, width } = useMeasuredWidth(widthProp);
  const hatchId = usePatternId("partial-hatch");
  const { enabled: eventsEnabled, events } = useChartEvents();
  const [hovered, setHovered] = useState<
    { x: number; y: number; label: string } | undefined
  >();

  const colorByKey = useMemo(
    () => new Map(seriesMeta.map((s) => [s.key, s.color])),
    [seriesMeta],
  );
  const nameByKey = useMemo(
    () => new Map(seriesMeta.map((s) => [s.key, s.name])),
    [seriesMeta],
  );

  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);

  const x0 = scaleBand<number>()
    .domain(series.years)
    .range([0, innerWidth])
    .paddingInner(0.2)
    .paddingOuter(0.1);

  // Event markers occupy a band above the plot; only the top margin depends on
  // their row count, and the row layout is horizontal — no circularity.
  const { placements: eventFlags, flagBandHeight } = selectEventFlags({
    enabled: eventsEnabled,
    events,
    years: series.years,
    x0,
    bandwidth: x0.bandwidth(),
    marginLeft: MARGIN.left,
    width,
  });
  const marginTop = MARGIN.top + flagBandHeight;
  const innerHeight = Math.max(0, height - marginTop - MARGIN.bottom);

  const x1 = scaleBand<string>()
    .domain(seriesMeta.map((s) => s.key))
    .range([0, x0.bandwidth()])
    .padding(0.05);
  const yMax = max(series.points, (p) => p.tonnes) ?? 0;
  // `|| 1` keeps an all-zero selection from collapsing scaleLinear's domain to
  // [0, 0], which maps every value to the range midpoint (half-height bars).
  const y = scaleLinear().domain([0, yMax || 1]).nice().range([innerHeight, 0]);

  const yTicks = y.ticks(5);
  const labelStep = xAxisLabelStep(series.years.length, innerWidth);
  const lastYearIndex = series.years.length - 1;

  return (
    <div ref={wrapRef} className="relative w-full overflow-x-clip">
      <figure className="m-0">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          height={height}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={ariaLabel}
          className="block max-w-full"
        >
          <PartialYearHatch id={hatchId} />

          <g transform={`translate(${MARGIN.left},${marginTop})`}>
            {/* y gridlines + labels */}
            {yTicks.map((tick) => (
              <g key={tick} transform={`translate(0,${y(tick)})`}>
                <line x1={0} x2={innerWidth} stroke="var(--color-border)" />
                <text
                  x={-8}
                  dy="0.32em"
                  textAnchor="end"
                  className="fill-muted text-[11px] tabular-nums"
                >
                  {formatTonnes(tick)}
                </text>
              </g>
            ))}
            {/* baseline / zero line */}
            <line
              x1={0}
              x2={innerWidth}
              y1={y(0)}
              y2={y(0)}
              stroke="var(--color-baseline)"
              strokeWidth={1.5}
            />

            {/* bars */}
            {series.points.map((p) => {
              const groupX = x0(p.year) ?? 0;
              const barX = groupX + (x1(p.seriesKey) ?? 0);
              const barY = y(p.tonnes);
              const barW = x1.bandwidth();
              const barH = Math.max(0, innerHeight - barY);
              const isPartial = p.year === partialYear;
              const label = `${nameByKey.get(p.seriesKey)}, ${p.year}: ${formatInt(
                Math.round(p.tonnes),
              )} tonnes${isPartial ? " (partial year)" : ""}`;
              const tip = {
                x: MARGIN.left + barX + barW / 2,
                y: marginTop + barY,
                label,
              };
              return (
                <g key={`${p.seriesKey}-${p.year}`}>
                  <rect
                    className="chart-bar transition-all duration-300 motion-reduce:transition-none"
                    x={barX}
                    y={barY}
                    width={barW}
                    height={barH}
                    fill={colorByKey.get(p.seriesKey)}
                    opacity={isPartial ? 0.55 : 1}
                    data-series={p.seriesKey}
                    data-year={p.year}
                    data-partial={isPartial ? "true" : undefined}
                    tabIndex={0}
                    role="img"
                    aria-label={label}
                    onMouseEnter={() => setHovered(tip)}
                    onMouseLeave={() => setHovered(undefined)}
                    onFocus={() => setHovered(tip)}
                    onBlur={() => setHovered(undefined)}
                  />
                  {isPartial && barH > 0 && (
                    <rect
                      className="pointer-events-none"
                      x={barX}
                      y={barY}
                      width={barW}
                      height={barH}
                      fill={`url(#${hatchId})`}
                      style={{ color: colorByKey.get(p.seriesKey) }}
                    />
                  )}
                </g>
              );
            })}

            {/* x axis labels — thinned on wide ranges, but the last year
                (and any partial year) always keeps its label */}
            {series.years.map((year, i) =>
              i % labelStep === 0 || i === lastYearIndex || year === partialYear ? (
                <text
                  key={year}
                  x={(x0(year) ?? 0) + x0.bandwidth() / 2}
                  y={innerHeight + 20}
                  textAnchor="middle"
                  className="fill-muted text-[11px] tabular-nums"
                >
                  {year}
                  {year === partialYear ? "*" : ""}
                </text>
              ) : null,
            )}
          </g>
        </svg>

        {partialYear !== undefined && series.years.includes(partialYear) && (
          <figcaption className="mt-1 text-[11px] text-muted">
            * {partialYear} is still being recorded — its total is incomplete.
          </figcaption>
        )}
      </figure>

      <EventOverlay
        placements={eventFlags}
        plotTop={marginTop}
        plotHeight={innerHeight}
      />

      <ChartLegend items={seriesMeta} />

      {hovered && (
        <ChartTooltip
          x={hovered.x}
          y={hovered.y}
          label={hovered.label}
          placement={hovered.y < 48 ? "below" : "above"}
        />
      )}
    </div>
  );
}
