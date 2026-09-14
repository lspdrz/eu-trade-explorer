"use client";

import { max } from "d3-array";
import { format } from "d3-format";
import { scaleLinear } from "d3-scale";
import { line as d3Line } from "d3-shape";
import { useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useMeasuredWidth } from "@/features/hooks/useMeasuredWidth";
import { ChartTooltip } from "@/features/components/ChartTooltip";

// top: leaves genuine whitespace above the plotted data for the marker
// label (see markerLabelY below) — it used to sit inside the plot area
// itself, where a data line passing near the top could cross straight
// through it.
const MARGIN = { top: 32, right: 16, bottom: 32, left: 48 };
// No explicit `height` prop: derive it from the measured width so the
// chart grows taller (not just wider) as its container does, instead of
// staying pinned at one fixed height regardless of screen size. Ratio
// matches the old fixed DEFAULT_HEIGHT=360 at the old fallback width=720.
const HEIGHT_RATIO = 0.5;
const MIN_HEIGHT = 280;
const MAX_HEIGHT = 640;
const REVEAL_DURATION_MS = 2500;
const FADE_DURATION_MS = 300;

const HIGHLIGHT_DASH = "6 3";

/** A small line swatch used both in the legend above the chart and inside
 *  the hover tooltip — dashed for the highlight series so it matches the
 *  line it identifies, instead of a plain solid-color bar either place.
 *  Deliberately its own dash pattern rather than reusing HIGHLIGHT_DASH
 *  verbatim: "6 3" starting at x=0 doesn't divide evenly into a 12-16px
 *  swatch
 * */
function LegendSwatch({ color, dashed, width = 16 }: { color: string; dashed: boolean; width?: number }) {
  const gap = 3;
  const dashLength = (width - gap) / 2;
  return (
    <svg width={width} height="2" className="block shrink-0" aria-hidden="true">
      <line
        x1={0}
        x2={width}
        y1={1}
        y2={1}
        stroke={color}
        strokeWidth={2}
        strokeDasharray={dashed ? `${dashLength} ${gap}` : undefined}
      />
    </svg>
  );
}

/** Compact tonnes for axis ticks: 1.2M, 450k, 3.1B (d3 emits "G", we want "B"). */
const formatTonnes = (n: number): string => format("~s")(n).replace("G", "B");
const formatTonnesExact = format(",");

export interface RuTimelineChartSeries {
  key: string;
  label: string;
  values: number[];
  color: string;
}

/**
 * A line chart of yearly RU import tonnes per named series, one bold
 * `highlightKey` series against thinner comparison lines — each series'
 * `color` is owned entirely by the caller (RuTimelineControls, via
 * assignColorSlots) so a chapter's color survives it being deselected and
 * reselected; this component never computes a color itself. On mount,
 * every visible line draws itself in left-to-right via a clip-path rect
 * that grows from 0 to the chart's full width (not per-path stroke-
 * dasharray/dashoffset — that would have to fight with HIGHLIGHT_DASH,
 * the highlighted line's own permanent dash pattern); a `series` that
 * changes later (the picker adding/
 * removing a chapter) only fades the *new* keys in (~300ms) — existing
 * lines are untouched, no replay. A hover crosshair shows every visible
 * series' value at the nearest year; the highlight line is dashed
 * (HIGHLIGHT_DASH) rather than labelled in-chart — the legend above names
 * every line, and up to 7 series can end up trailing off toward similar
 * values (see comextRu data near 2023+), which made end-of-line labels
 * collide with each other rather than reliably identify anything.
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
  height: heightProp,
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
  const { ref: wrapRef, width, hasMeasured } = useMeasuredWidth(widthProp, 720);
  const height =
    heightProp ?? Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.round(width * HEIGHT_RATIO)));
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
  const clipRectRef = useRef<SVGRectElement | null>(null);
  const knownKeysRef = useRef<Set<string>>(new Set());
  // Fragment id for the reveal clip-path — useId() includes colons, which
  // are valid in an `id` attribute but not worth risking inside a `url(#…)`
  // reference, so they're stripped.
  const clipId = `ru-timeline-reveal-${useId().replace(/:/g, "")}`;

  useLayoutEffect(() => {
    const currentKeys = series.map((s) => s.key);
    const isInitial = knownKeysRef.current.size === 0;
    const newKeys = currentKeys.filter((k) => !knownKeysRef.current.has(k));
    if (newKeys.length === 0) return;
    // The very first render measures paths against useMeasuredWidth's
    // fallback width (and the height derived from it), before the
    // ResizeObserver has corrected it to the real container size. Starting
    // the reveal against that placeholder geometry, only to have the real
    // measurement land moments later and reflow every path's `d` — without
    // this effect re-running to resize the in-flight dasharray/dashoffset
    // to match — desyncs the animation from the new path shape. Wait for
    // the real measurement so the reveal is only ever set up once, against
    // final geometry.
    if (isInitial && !hasMeasured) return;

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
      const rect = clipRectRef.current;
      if (rect) {
        rect.style.transform = "scaleX(0)";
        raf = requestAnimationFrame(() => {
          rect.style.transition = `transform ${REVEAL_DURATION_MS}ms ease-out`;
          rect.style.transform = "scaleX(1)";
          knownKeysRef.current = new Set(currentKeys); // commit only once the reveal actually starts
        });
        // Once the reveal has actually finished, drop the inline
        // transform/transition entirely so a later resize just renders the
        // rect at its normal (always-correct, reactive) full width with no
        // leftover scale applied.
        setTimeout(() => {
          rect.style.transform = "";
          rect.style.transition = "";
        }, REVEAL_DURATION_MS);
      } else {
        knownKeysRef.current = new Set(currentKeys);
      }
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
  }, [series, markerYear, markerMonth, yearMin, yearMax, hasMeasured]);

  const markerX =
    markerYear !== undefined ? xScale(markerYear + (markerMonth - 1) / 12) : undefined;
  // Flip the marker label to the left of its line when there isn't room to
  // the right — no ref/measurement available at render time, so this is an
  // estimate (~5.8px/char at text-[11px]) rather than the label's exact
  // rendered width, but it only needs to be right at the boundary.
  const markerLabelFitsRight =
    markerX === undefined || !markerLabel || innerWidth - markerX >= markerLabel.length * 5.8 + 6;
  // Sits above the plotted data entirely (negative = inside MARGIN.top's
  // whitespace, above inner-y=0 where the tallest gridline/data lives) —
  // it used to be at a fixed y *inside* the plot, where a data line
  // passing near the top could cross straight through the text.
  const markerLabelY = -16;
  const yTicks = yScale.ticks(5);
  const xTicks = xScale.ticks(Math.min(years.length, 8));

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
      <figure className="relative m-0">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          height={height}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`Russian imports by year, ${yearMin}–${yearMax}`}
          className="block max-w-full"
        >
          <defs>
            <clipPath id={clipId}>
              {/* Only clips horizontally — y/height are generous so no
                  data line is ever clipped vertically, whatever the margins
                  end up being. width/x are plain reactive JSX (always the
                  current innerWidth, untouched by the reveal effect); the
                  reveal only ever animates transform: scaleX, anchored at
                  the left edge so it grows rightward from x=0. */}
              <rect
                ref={clipRectRef}
                x={0}
                y={-height}
                width={innerWidth}
                height={height * 3}
                style={{ transformOrigin: "0 0" }}
              />
            </clipPath>
          </defs>
          <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
            {yTicks.map((tick) => (
              <g key={tick} transform={`translate(0,${yScale(tick)})`}>
                <line x1={0} x2={innerWidth} stroke="var(--color-border)" />
                <text x={4 - MARGIN.left} dy="0.32em" textAnchor="start" className="fill-muted text-[11px] tabular-nums">
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

            <g clipPath={`url(#${clipId})`}>
              {series.map((s) => (
                <path
                  key={s.key}
                  ref={(el) => {
                    pathRefs.current.set(s.key, el);
                  }}
                  d={lineGen(s.values) ?? ""}
                  fill="none"
                  stroke={s.color}
                  style={{ visibility: hasMeasured ? "visible" : "hidden" }}
                  strokeWidth={s.key === highlightKey ? 2.5 : 1.5}
                  strokeDasharray={s.key === highlightKey ? HIGHLIGHT_DASH : undefined}
                />
              ))}
            </g>

            {markerX !== undefined && (
              <g ref={markerRef} style={{ opacity: 0 }}>
                <line
                  x1={markerX}
                  x2={markerX}
                  y1={markerLabelY}
                  y2={innerHeight}
                  stroke="var(--color-baseline)"
                  strokeDasharray="4 4"
                />
                {markerLabel && (
                  <text
                    x={markerX + (markerLabelFitsRight ? 6 : -6)}
                    y={markerLabelY}
                    textAnchor={markerLabelFitsRight ? "start" : "end"}
                    className="fill-muted text-[11px]"
                  >
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
            containerWidth={width}
            hAlign="side"
          >
            <div className="font-semibold">{years[hoveredIndex]}</div>
            {series.map((s) => (
              <div key={s.key} className="flex items-center gap-1.5 whitespace-nowrap">
                <LegendSwatch color={s.color} dashed={s.key === highlightKey} width={12} />
                <span className="font-semibold tabular-nums">
                  {formatTonnesExact(Math.round(s.values[hoveredIndex] ?? 0))} t
                </span>
                <span className="text-muted">{s.label}</span>
              </div>
            ))}
          </ChartTooltip>
        )}
      </figure>
      <div className="mt-3 flex flex-wrap gap-4 text-sm">
        {series.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <LegendSwatch color={s.color} dashed={s.key === highlightKey} />
            <span className={s.key === highlightKey ? "font-semibold" : "text-muted"}>
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
