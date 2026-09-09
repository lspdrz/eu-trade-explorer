"use client";

import { max } from "d3-array";
import { format } from "d3-format";
import { scaleBand, scaleLinear } from "d3-scale";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { GroupedSeries } from "../../types";
import { xAxisLabelStep } from "../utils/xAxisLabelStep";
import { ChartTooltip } from "./ChartTooltip";

/** A selected series (partner country or product) and its assigned colour. */
export interface SelectedSeries {
  key: string;
  name: string;
  color: string;
}

const MARGIN = { top: 16, right: 16, bottom: 40, left: 64 };
const DEFAULT_WIDTH = 960;
const DEFAULT_HEIGHT = 420;

const formatTonnes = (n: number): string => format("~s")(n).replace("G", "B");
const formatInt = format(",");

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
  const wrapRef = useRef<HTMLDivElement>(null);
  // useId() contains colons (`:r0:`), invalid in a `url(#…)` reference.
  const hatchId = `partial-hatch-${useId().replace(/:/g, "")}`;
  const [measuredWidth, setMeasuredWidth] = useState(widthProp ?? DEFAULT_WIDTH);
  const [hovered, setHovered] = useState<
    { x: number; y: number; label: string } | undefined
  >();

  useEffect(() => {
    if (widthProp !== undefined) return;
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setMeasuredWidth(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [widthProp]);

  const width = widthProp ?? measuredWidth;

  const colorByKey = useMemo(
    () => new Map(seriesMeta.map((s) => [s.key, s.color])),
    [seriesMeta],
  );
  const nameByKey = useMemo(
    () => new Map(seriesMeta.map((s) => [s.key, s.name])),
    [seriesMeta],
  );

  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerHeight = Math.max(0, height - MARGIN.top - MARGIN.bottom);

  const x0 = scaleBand<number>()
    .domain(series.years)
    .range([0, innerWidth])
    .paddingInner(0.2)
    .paddingOuter(0.1);
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
          <defs>
            <pattern
              id={hatchId}
              patternUnits="userSpaceOnUse"
              width={6}
              height={6}
              patternTransform="rotate(45)"
            >
              <rect width={6} height={6} fill="transparent" />
              <line x1={0} y1={0} x2={0} y2={6} stroke="currentColor" strokeWidth={2} />
            </pattern>
          </defs>

          <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
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
                y: MARGIN.top + barY,
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

      {/* legend */}
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
        {seriesMeta.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            {s.name}
          </li>
        ))}
      </ul>

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
