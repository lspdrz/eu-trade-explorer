"use client";

import { max } from "d3-array";
import { format } from "d3-format";
import { scaleBand, scaleLinear } from "d3-scale";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { GroupedSeries } from "../../types";
import { xAxisLabelStep } from "../utils/xAxisLabelStep";
import { ChartTooltip } from "./ChartTooltip";

export interface SelectedCountry {
  code: string;
  name: string;
  color: string;
}

const MARGIN = { top: 16, right: 16, bottom: 40, left: 64 };
const DEFAULT_WIDTH = 960;
const DEFAULT_HEIGHT = 420;

const formatTonnes = (n: number): string => format("~s")(n).replace("G", "B");
const formatInt = format(",");

export function ImportsBarChart({
  series,
  countries,
  partialYear,
  width: widthProp,
  height = DEFAULT_HEIGHT,
}: {
  series: GroupedSeries;
  countries: SelectedCountry[];
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

  const colorByCode = useMemo(
    () => new Map(countries.map((c) => [c.code, c.color])),
    [countries],
  );
  const nameByCode = useMemo(
    () => new Map(countries.map((c) => [c.code, c.name])),
    [countries],
  );

  if (countries.length === 0) {
    return (
      <div
        ref={wrapRef}
        className="flex h-[420px] items-center justify-center rounded-lg border border-dashed border-border text-muted"
      >
        Search for up to 3 countries to compare
      </div>
    );
  }

  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerHeight = Math.max(0, height - MARGIN.top - MARGIN.bottom);

  const x0 = scaleBand<number>()
    .domain(series.years)
    .range([0, innerWidth])
    .paddingInner(0.2)
    .paddingOuter(0.1);
  const x1 = scaleBand<string>()
    .domain(countries.map((c) => c.code))
    .range([0, x0.bandwidth()])
    .padding(0.05);
  const yMax = max(series.points, (p) => p.tonnes) ?? 0;
  // `|| 1` keeps an all-zero selection from collapsing scaleLinear's domain to
  // [0, 0], which maps every value to the range midpoint (half-height bars).
  const y = scaleLinear().domain([0, yMax || 1]).nice().range([innerHeight, 0]);

  const yTicks = y.ticks(5);
  const labelStep = xAxisLabelStep(series.years.length);
  const lastYearIndex = series.years.length - 1;
  const summary = `EU imports in tonnes per year for ${countries
    .map((c) => c.name)
    .join(", ")}`;

  return (
    <div ref={wrapRef} className="relative w-full">
      <figure className="m-0">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          height={height}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={summary}
          className="overflow-visible"
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
              const barX = groupX + (x1(p.partnerCode) ?? 0);
              const barY = y(p.tonnes);
              const barW = x1.bandwidth();
              const barH = Math.max(0, innerHeight - barY);
              const isPartial = p.year === partialYear;
              const label = `${nameByCode.get(p.partnerCode)}, ${p.year}: ${formatInt(
                Math.round(p.tonnes),
              )} tonnes${isPartial ? " (partial year)" : ""}`;
              const tip = {
                x: MARGIN.left + barX + barW / 2,
                y: MARGIN.top + barY,
                label,
              };
              return (
                <g key={`${p.partnerCode}-${p.year}`}>
                  <rect
                    className="chart-bar transition-all duration-300"
                    x={barX}
                    y={barY}
                    width={barW}
                    height={barH}
                    fill={colorByCode.get(p.partnerCode)}
                    opacity={isPartial ? 0.55 : 1}
                    data-partner={p.partnerCode}
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
                      style={{ color: colorByCode.get(p.partnerCode) }}
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
            * {partialYear} is still in progress — its totals are incomplete.
          </figcaption>
        )}
      </figure>

      {/* legend */}
      <ul className="mt-3 flex flex-wrap gap-4 text-sm">
        {countries.map((c) => (
          <li key={c.code} className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: c.color }}
            />
            {c.name}
          </li>
        ))}
      </ul>

      {/* screen-reader / no-JS data table — the same numbers, tabular */}
      <table className="sr-only">
        <caption>EU imports in tonnes per year</caption>
        <thead>
          <tr>
            <th scope="col">Country</th>
            {series.years.map((year) => (
              <th key={year} scope="col">
                {year}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {countries.map((c) => (
            <tr key={c.code}>
              <th scope="row">{c.name}</th>
              {series.years.map((year) => {
                const point = series.points.find(
                  (p) => p.partnerCode === c.code && p.year === year,
                );
                return <td key={year}>{formatInt(Math.round(point?.tonnes ?? 0))}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>

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
