"use client";

import { max } from "d3-array";
import { format } from "d3-format";
import { scaleLinear } from "d3-scale";
import { line as d3Line } from "d3-shape";
import { useLayoutEffect, useMemo, useRef } from "react";
import { useMeasuredWidth } from "@/features/hooks/useMeasuredWidth";

const MARGIN = { top: 16, right: 16, bottom: 32, left: 56 };
const DEFAULT_HEIGHT = 360;
const REVEAL_DURATION_MS = 2500;

/** Compact tonnes for axis ticks: 1.2M, 450k, 3.1B (d3 emits "G", we want "B"). */
const formatTonnes = (n: number): string => format("~s")(n).replace("G", "B");

export interface RuTimelineChartSeries {
  key: string;
  label: string;
  values: number[];
}

/**
 * A line chart of yearly RU import tonnes per named series, one bold
 * `highlightKey` series against thinner muted comparison lines. On mount,
 * each line draws itself in left-to-right via the stroke-dasharray reveal
 * technique, landing on the finished chart; an optional vertical marker
 * (e.g. Feb 2022) fades in when the reveal reaches it. Runs once, entirely
 * via refs + useLayoutEffect (not React state) — same "imperative DOM
 * update, no re-render" idiom the globe uses for its own reduced-motion
 * check, and it runs before the browser paints, so there's no one-frame
 * flash of the undrawn line. `prefers-reduced-motion` skips the reveal
 * entirely — everything renders at its final state immediately.
 */
export function RuTimelineChart({
  years,
  series,
  highlightKey,
  markerYear,
  markerMonth = 1,
  markerLabel,
  width: widthProp,
  height = DEFAULT_HEIGHT,
}: {
  years: number[];
  series: RuTimelineChartSeries[];
  highlightKey: string;
  markerYear?: number;
  markerMonth?: number;
  markerLabel?: string;
  width?: number;
  height?: number;
}) {
  const { ref: wrapRef, width } = useMeasuredWidth(widthProp, 720);
  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerHeight = Math.max(0, height - MARGIN.top - MARGIN.bottom);

  const yearMin = years.length > 0 ? Math.min(...years) : 0;
  const yearMax = years.length > 0 ? Math.max(...years) : 0;

  const xScale = useMemo(
    () => scaleLinear().domain([yearMin, yearMax]).range([0, innerWidth]),
    [yearMin, yearMax, innerWidth],
  );
  const yMax = max(series.flatMap((s) => s.values)) ?? 0;
  const yScale = useMemo(
    () => scaleLinear().domain([0, yMax || 1]).nice().range([innerHeight, 0]),
    [yMax, innerHeight],
  );
  const lineGen = useMemo(
    () => d3Line<number>().x((_, i) => xScale(years[i])).y((v) => yScale(v)),
    [xScale, yScale, years],
  );

  const pathRefs = useRef(new Map<string, SVGPathElement | null>());
  const markerRef = useRef<SVGGElement | null>(null);
  const hasAnimated = useRef(false);

  useLayoutEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      if (markerRef.current) markerRef.current.style.opacity = "1";
      return;
    }

    const paths = [...pathRefs.current.values()].filter(
      (p): p is SVGPathElement => p !== null,
    );
    const lengths = paths.map((p) => p.getTotalLength());
    paths.forEach((p, i) => {
      p.style.strokeDasharray = `${lengths[i]}`;
      p.style.strokeDashoffset = `${lengths[i]}`;
    });

    const raf = requestAnimationFrame(() => {
      paths.forEach((p) => {
        p.style.transition = `stroke-dashoffset ${REVEAL_DURATION_MS}ms ease-out`;
        p.style.strokeDashoffset = "0";
      });
    });

    let markerTimer: ReturnType<typeof setTimeout> | undefined;
    if (markerYear !== undefined && yearMax > yearMin) {
      const fraction = (markerYear + (markerMonth - 1) / 12 - yearMin) / (yearMax - yearMin);
      markerTimer = setTimeout(
        () => {
          if (markerRef.current) {
            markerRef.current.style.transition = "opacity 400ms ease-out";
            markerRef.current.style.opacity = "1";
          }
        },
        Math.max(0, Math.min(1, fraction)) * REVEAL_DURATION_MS,
      );
    }

    return () => {
      cancelAnimationFrame(raf);
      if (markerTimer) clearTimeout(markerTimer);
    };
  }, [markerYear, markerMonth, yearMin, yearMax]);

  const markerX =
    markerYear !== undefined ? xScale(markerYear + (markerMonth - 1) / 12) : undefined;
  const yTicks = yScale.ticks(5);
  const xTicks = xScale.ticks(Math.min(years.length, 8));

  return (
    <div ref={wrapRef} className="relative w-full overflow-x-clip">
      <div className="mb-3 flex gap-4 text-sm">
        {series.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span
              className="inline-block h-0.5 w-4"
              style={{
                background: s.key === highlightKey ? "var(--color-series-1)" : "var(--color-muted)",
              }}
            />
            <span className={s.key === highlightKey ? "font-semibold" : "text-muted"}>
              {s.label}
            </span>
          </div>
        ))}
      </div>
      <figure className="m-0">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          height={height}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`Russian imports by year, ${yearMin}–${yearMax}`}
          className="block max-w-full"
        >
          <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
            {yTicks.map((tick) => (
              <g key={tick} transform={`translate(0,${yScale(tick)})`}>
                <line x1={0} x2={innerWidth} stroke="var(--color-border)" />
                <text x={-8} dy="0.32em" textAnchor="end" className="fill-muted text-[11px] tabular-nums">
                  {formatTonnes(tick)}
                </text>
              </g>
            ))}
            {xTicks.map((tick) => (
              <text
                key={tick}
                x={xScale(tick)}
                y={innerHeight + 20}
                textAnchor="middle"
                className="fill-muted text-[11px] tabular-nums"
              >
                {Math.round(tick)}
              </text>
            ))}
            <line
              x1={0}
              x2={innerWidth}
              y1={yScale(0)}
              y2={yScale(0)}
              stroke="var(--color-baseline)"
              strokeWidth={1.5}
            />

            {series.map((s) => (
              <path
                key={s.key}
                ref={(el) => {
                  pathRefs.current.set(s.key, el);
                }}
                d={lineGen(s.values) ?? ""}
                fill="none"
                stroke={s.key === highlightKey ? "var(--color-series-1)" : "var(--color-muted)"}
                strokeWidth={s.key === highlightKey ? 2.5 : 1.5}
              />
            ))}

            {markerX !== undefined && (
              <g ref={markerRef} style={{ opacity: 0 }}>
                <line
                  x1={markerX}
                  x2={markerX}
                  y1={0}
                  y2={innerHeight}
                  stroke="var(--color-baseline)"
                  strokeDasharray="4 4"
                />
                {markerLabel && (
                  <text x={markerX + 6} y={12} className="fill-muted text-[11px]">
                    {markerLabel}
                  </text>
                )}
              </g>
            )}
          </g>
        </svg>
      </figure>
    </div>
  );
}
