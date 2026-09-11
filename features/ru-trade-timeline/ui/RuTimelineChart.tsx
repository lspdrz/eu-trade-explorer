"use client";

import { max } from "d3-array";
import { format } from "d3-format";
import { scaleLinear } from "d3-scale";
import { line as d3Line } from "d3-shape";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useMeasuredWidth } from "@/features/hooks/useMeasuredWidth";
import { ChartTooltip } from "@/features/components/ChartTooltip";

const MARGIN = { top: 16, right: 16, bottom: 32, left: 56 };
const DEFAULT_HEIGHT = 360;
const REVEAL_DURATION_MS = 2500;
const FADE_DURATION_MS = 300;
const MAX_DIRECT_LABELS = 4;

/** Compact tonnes for axis ticks: 1.2M, 450k, 3.1B (d3 emits "G", we want "B"). */
const formatTonnes = (n: number): string => format("~s")(n).replace("G", "B");
const formatTonnesExact = format(",");

export interface RuTimelineChartSeries {
  key: string;
  label: string;
  values: number[];
  /** CSS color (a `var(--color-series-N)` reference), owned by the caller —
   *  RuTimelineControls assigns this via assignColorSlots so a chapter
   *  keeps its color while selected ("color follows the slot, not the
   *  position"), the same pattern StackedChartPanel already uses. This
   *  component never invents a color from array position. */
  color: string;
}

/** Which series (by key) draw a label at their line's right end — fertiliser (if present)
 *  plus the largest MAX_DIRECT_LABELS-1 others by final value, capped at MAX_DIRECT_LABELS total. */
function selectDirectLabelKeys(series: RuTimelineChartSeries[], highlightKey: string): Set<string> {
  const rest = series
    .filter((s) => s.key !== highlightKey)
    .slice()
    .sort((a, b) => (b.values[b.values.length - 1] ?? 0) - (a.values[a.values.length - 1] ?? 0));
  const hasHighlight = series.some((s) => s.key === highlightKey);
  const budget = MAX_DIRECT_LABELS - (hasHighlight ? 1 : 0);
  const keys = new Set(rest.slice(0, Math.max(0, budget)).map((s) => s.key));
  if (hasHighlight) keys.add(highlightKey);
  return keys;
}

/**
 * A line chart of yearly RU import tonnes per named series, one bold
 * `highlightKey` series against thinner comparison lines — each series'
 * `color` is owned entirely by the caller (RuTimelineControls, via
 * assignColorSlots) so a chapter's color survives it being deselected and
 * reselected; this component never computes a color itself. On mount,
 * every visible line draws itself in left-to-right via the stroke-dasharray
 * reveal technique; a `series` that changes later (the picker adding/
 * removing a chapter) only fades the *new* keys in (~300ms) — existing
 * lines are untouched, no replay. A hover crosshair shows every visible
 * series' value at the nearest year; up to 4 series (the highlight + the
 * largest others) get a direct label at their line's right end.
 * `prefers-reduced-motion` skips both the initial reveal and the fade —
 * everything renders at final state immediately.
 *
 * The animation effect deliberately has no "only once" ref guard for the
 * *initial* reveal, and commits its "which keys have appeared" bookkeeping
 * only inside the requestAnimationFrame callback that actually fires —
 * never synchronously in the effect body. Both are required for this to
 * survive React Strict Mode's dev-only double-invoke (mount, cleanup,
 * mount again): a guard set synchronously would make the second
 * (persisting) invocation see "already handled" and skip rescheduling the
 * reveal the first invocation's cleanup just cancelled, leaving every line
 * permanently hidden — a real bug hit earlier in this feature.
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
  const knownKeysRef = useRef<Set<string>>(new Set());

  useLayoutEffect(() => {
    const currentKeys = series.map((s) => s.key);
    const isInitial = knownKeysRef.current.size === 0;
    const newKeys = currentKeys.filter((k) => !knownKeysRef.current.has(k));
    if (newKeys.length === 0) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      knownKeysRef.current = new Set(currentKeys);
      if (isInitial && markerRef.current) markerRef.current.style.opacity = "1";
      return;
    }

    const newPaths = newKeys
      .map((k) => pathRefs.current.get(k))
      .filter((p): p is SVGPathElement => p !== null);

    let raf: number;
    let markerTimer: ReturnType<typeof setTimeout> | undefined;

    if (isInitial) {
      // Full stroke-dasharray draw-in for every initially-visible series.
      const lengths = newPaths.map((p) => p.getTotalLength());
      newPaths.forEach((p, i) => {
        p.style.strokeDasharray = `${lengths[i]}`;
        p.style.strokeDashoffset = `${lengths[i]}`;
      });
      raf = requestAnimationFrame(() => {
        newPaths.forEach((p) => {
          p.style.transition = `stroke-dashoffset ${REVEAL_DURATION_MS}ms ease-out`;
          p.style.strokeDashoffset = "0";
        });
        knownKeysRef.current = new Set(currentKeys); // commit only once the reveal actually starts
      });
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
    } else {
      // A later selection change: only the new keys get a quick fade.
      newPaths.forEach((p) => {
        p.style.opacity = "0";
      });
      raf = requestAnimationFrame(() => {
        newPaths.forEach((p) => {
          p.style.transition = `opacity ${FADE_DURATION_MS}ms ease-out`;
          p.style.opacity = "1";
        });
        knownKeysRef.current = new Set(currentKeys);
      });
    }

    return () => {
      cancelAnimationFrame(raf);
      if (markerTimer) clearTimeout(markerTimer);
    };
  }, [series, markerYear, markerMonth, yearMin, yearMax]);

  const markerX =
    markerYear !== undefined ? xScale(markerYear + (markerMonth - 1) / 12) : undefined;
  const yTicks = yScale.ticks(5);
  const xTicks = xScale.ticks(Math.min(years.length, 8));
  const directLabelKeys = selectDirectLabelKeys(series, highlightKey);

  // --- hover crosshair ---
  const [hoveredIndex, setHoveredIndex] = useState<number | undefined>(undefined);

  function nearestYearIndex(mouseX: number): number {
    let best = 0;
    let bestDist = Infinity;
    years.forEach((y, i) => {
      const d = Math.abs(xScale(y) - mouseX);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    return best;
  }

  function handlePointerMove(e: React.PointerEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredIndex(nearestYearIndex(e.clientX - rect.left));
  }

  function handleKeyDown(e: React.KeyboardEvent<SVGRectElement>) {
    if (e.key === "ArrowLeft") {
      setHoveredIndex((i) => Math.max(0, (i ?? years.length) - 1));
    } else if (e.key === "ArrowRight") {
      setHoveredIndex((i) => Math.min(years.length - 1, (i ?? -1) + 1));
    }
  }

  return (
    <div ref={wrapRef} className="relative w-full overflow-x-clip">
      <div className="mb-3 flex flex-wrap gap-4 text-sm">
        {series.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4" style={{ background: s.color }} />
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
                stroke={s.color}
                strokeWidth={s.key === highlightKey ? 2.5 : 1.5}
              />
            ))}

            {series
              .filter((s) => directLabelKeys.has(s.key))
              .map((s) => (
                <text
                  key={`label-${s.key}`}
                  x={innerWidth + 4}
                  y={yScale(s.values[s.values.length - 1] ?? 0)}
                  dy="0.32em"
                  className="fill-muted text-[10px]"
                >
                  {s.label}
                </text>
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

            {hoveredIndex !== undefined && (
              <line
                x1={xScale(years[hoveredIndex])}
                x2={xScale(years[hoveredIndex])}
                y1={0}
                y2={innerHeight}
                stroke="var(--color-muted)"
                strokeWidth={1}
              />
            )}

            <rect
              x={0}
              y={0}
              width={innerWidth}
              height={innerHeight}
              fill="transparent"
              tabIndex={0}
              onPointerMove={handlePointerMove}
              onPointerLeave={() => setHoveredIndex(undefined)}
              onFocus={() => setHoveredIndex((i) => i ?? years.length - 1)}
              onBlur={() => setHoveredIndex(undefined)}
              onKeyDown={handleKeyDown}
            />
          </g>
        </svg>
        {hoveredIndex !== undefined && (
          <ChartTooltip
            x={MARGIN.left + xScale(years[hoveredIndex])}
            y={MARGIN.top}
            placement="below"
          >
            <div className="font-semibold">{years[hoveredIndex]}</div>
            {series.map((s) => (
              <div key={s.key} className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="inline-block h-0.5 w-3" style={{ background: s.color }} />
                <span className="font-semibold tabular-nums">
                  {formatTonnesExact(Math.round(s.values[hoveredIndex] ?? 0))} t
                </span>
                <span className="text-muted">{s.label}</span>
              </div>
            ))}
          </ChartTooltip>
        )}
      </figure>
    </div>
  );
}
