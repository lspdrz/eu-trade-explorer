"use client";

import { max } from "d3-array";
import { scaleBand, scaleLinear } from "d3-scale";
import { useMemo, useState } from "react";
import type { SelectedSeries, StackedSeries } from "@/features/trade-data/types";
import { formatInt, formatTonnes } from "@/features/trade-data/lib/chartFormat";
import { selectEventFlags } from "@/features/trade-data/lib/chart-events/selectEventFlags";
import { xAxisLabelStep } from "@/features/trade-data/lib/xAxisLabelStep";
import { useChartEvents } from "@/features/trade-data/ui/hooks/useChartEvents";
import { useMeasuredWidth } from "@/features/hooks/useMeasuredWidth";
import { ChartLegend } from "@/features/trade-data/ui/components/ChartLegend";
import { ChartTooltip } from "@/features/trade-data/ui/components/ChartTooltip";
import { EventOverlay } from "@/features/trade-data/ui/components/EventOverlay";
import { PartialYearHatch, usePatternId } from "@/features/trade-data/ui/components/PartialYearHatch";

const MARGIN = { top: 16, right: 16, bottom: 52, left: 64 };
const DEFAULT_HEIGHT = 420;
const SEGMENT_GAP = 2;

/**
 * Stacked bar chart of yearly import tonnes: an x0 band per year, an x1 band
 * per partner country within it, each bar a stack of product segments.
 * Colour = product. A country code sits under every bar (always — even with
 * one product); the year label spans the whole year group below that.
 */
export function StackedImportsChart({
  series,
  seriesMeta,
  nameForCountry,
  ariaLabel,
  partialYear,
  width: widthProp,
  height = DEFAULT_HEIGHT,
}: {
  series: StackedSeries;
  seriesMeta: SelectedSeries[];
  nameForCountry: (code: string) => string;
  ariaLabel: string;
  partialYear?: number;
  width?: number;
  height?: number;
}) {
  const { ref: wrapRef, width } = useMeasuredWidth(widthProp, 960);
  const hatchId = usePatternId("partial-hatch");
  const { enabled: eventsEnabled, events } = useChartEvents();
  const [hovered, setHovered] = useState<
    { x: number; y: number; label: string } | undefined
  >();

  const colorByProduct = useMemo(
    () => new Map(seriesMeta.map((s) => [s.key, s.color])),
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
    .domain(series.partnerCodes)
    .range([0, x0.bandwidth()])
    .padding(0.05);

  const yMax = max(series.cells, (c) => c.total) ?? 0;
  // `|| 1` keeps an all-zero selection from collapsing the domain to [0, 0].
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

            {/* stacked bars */}
            {series.cells.map((cell) => {
              const groupX = x0(cell.year) ?? 0;
              const barX = groupX + (x1(cell.partnerCode) ?? 0);
              const barW = x1.bandwidth();
              const isPartial = cell.year === partialYear;
              const countryName = nameForCountry(cell.partnerCode);
              return (
                <g key={`${cell.year}-${cell.partnerCode}`}>
                  {cell.segments.map((seg) => {
                    if (seg.tonnes <= 0) return null;
                    const top = y(seg.y1);
                    const bottom = y(seg.y0);
                    const segH = Math.max(0, bottom - top - SEGMENT_GAP);
                    const label = `${countryName} · ${seg.product}, ${cell.year}: ${formatInt(
                      Math.round(seg.tonnes),
                    )} tonnes${isPartial ? " (partial year)" : ""}`;
                    const tip = {
                      x: MARGIN.left + barX + barW / 2,
                      y: marginTop + top,
                      label,
                    };
                    return (
                      <g key={seg.product}>
                        <rect
                          className="chart-bar transition-all duration-300 motion-reduce:transition-none"
                          x={barX}
                          y={top}
                          width={barW}
                          height={segH}
                          fill={colorByProduct.get(seg.product)}
                          opacity={isPartial ? 0.55 : 1}
                          data-series={seg.product}
                          data-partner={cell.partnerCode}
                          data-year={cell.year}
                          data-partial={isPartial ? "true" : undefined}
                          tabIndex={0}
                          role="img"
                          aria-label={label}
                          onMouseEnter={() => setHovered(tip)}
                          onMouseLeave={() => setHovered(undefined)}
                          onFocus={() => setHovered(tip)}
                          onBlur={() => setHovered(undefined)}
                        />
                        {isPartial && segH > 0 && (
                          <rect
                            className="pointer-events-none"
                            x={barX}
                            y={top}
                            width={barW}
                            height={segH}
                            fill={`url(#${hatchId})`}
                            style={{ color: colorByProduct.get(seg.product) }}
                          />
                        )}
                      </g>
                    );
                  })}

                  {/* country code under this bar */}
                  <text
                    x={barX + barW / 2}
                    y={innerHeight + 14}
                    textAnchor="middle"
                    className="fill-muted text-[10px]"
                  >
                    {cell.partnerCode}
                  </text>
                </g>
              );
            })}

            {/* year labels — one per year group, thinned on wide ranges */}
            {series.years.map((year, i) =>
              i % labelStep === 0 || i === lastYearIndex || year === partialYear ? (
                <text
                  key={year}
                  x={(x0(year) ?? 0) + x0.bandwidth() / 2}
                  y={innerHeight + 30}
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
