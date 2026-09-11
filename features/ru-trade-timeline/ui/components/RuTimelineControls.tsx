"use client";

import { useMemo, useState, useTransition } from "react";
import { ProductMultiSelect } from "@/features/components/ProductMultiSelect";
import { assignColorSlots } from "@/features/utils/assignColorSlots";
import { HS_CHAPTER_NAMES } from "@/features/ru-trade-timeline/constants/hsChapterNames";
import { EXCLUDED_CHAPTERS, DEFAULT_COMPARISON_CHAPTERS, TOP_COMPARISON_CHAPTERS } from "@/features/ru-trade-timeline/constants/defaultComparisonChapters";
import { fetchChapterSeries } from "@/features/ru-trade-timeline/lib/fetchChapterSeries";
import { RuTimelineChart, type RuTimelineChartSeries } from "@/features/ru-trade-timeline/ui/components/RuTimelineChart";
import type { RuTimelineData, RuTimelineSeries } from "@/features/ru-trade-timeline/types";

const MAX_SELECTED = 7;
const HIGHLIGHT_KEY = "fertiliser";
const HIGHLIGHT_COLOR = "var(--color-series-1)";
// Slots 2-8 of the validated categorical palette (slot 1 is reserved for
// fertiliser, assigned directly above, never through assignColorSlots) —
// see app/globals.css for the validation.
const COMPARISON_COLORS = [
  "var(--color-series-2)",
  "var(--color-series-3)",
  "var(--color-series-4)",
  "var(--color-series-5)",
  "var(--color-series-6)",
  "var(--color-series-7)",
  "var(--color-series-8)",
];

// code -> label, sorted alphabetically by name, excluding fertiliser overlap
// and non-category chapters. Chapter code IS the picker's "product" value —
// ProductMultiSelect is generic over strings, so no extra id/label mapping
// layer is needed beyond this lookup.
const PICKER_OPTIONS = Object.entries(HS_CHAPTER_NAMES)
  .filter(([code]) => !EXCLUDED_CHAPTERS.includes(code))
  .sort((a, b) => a[1].localeCompare(b[1]))
  .map(([, label]) => label);

const CODE_BY_LABEL = new Map(Object.entries(HS_CHAPTER_NAMES).map(([code, label]) => [label, code]));
const LABEL_BY_CODE = new Map(Object.entries(HS_CHAPTER_NAMES).map(([code, label]) => [code, label]));

// Fixed, not derived from live selection: the picker's "topProducts" group
// must not shrink when a default gets deselected — it stays pinned at the
// top, checkmark just clears. A stable list is what makes that possible.
const DEFAULT_COMPARISON_LABELS = DEFAULT_COMPARISON_CHAPTERS.map((c) => LABEL_BY_CODE.get(c) ?? c);
const TOP_PRODUCTS_LABELS = TOP_COMPARISON_CHAPTERS.map((c) => LABEL_BY_CODE.get(c) ?? c);

/**
 * Client wrapper: holds selection state, a session-lived cache of every
 * chapter's series fetched so far (seeded with the build-time defaults —
 * no fetch needed for them), which chapters are mid-fetch, and stable
 * color slots (assignColorSlots — "color follows the slot, not the
 * position," same pattern StackedChartPanel already uses, recomputed
 * during render rather than in an effect when the selected set changes).
 * Selecting an already-cached chapter, or deselecting any chapter, is
 * synchronous local state; selecting an uncached one calls the
 * fetchChapterSeries Server Action.
 */
export function RuTimelineControls({ initialData }: { initialData: RuTimelineData }) {
  const [selectedChapters, setSelectedChapters] = useState<string[]>(DEFAULT_COMPARISON_CHAPTERS);
  const [loadedSeries, setLoadedSeries] = useState<Record<string, RuTimelineSeries>>(() => {
    const map: Record<string, RuTimelineSeries> = {};
    for (const s of initialData.series) map[s.key] = s;
    return map;
  });
  const [pendingChapters, setPendingChapters] = useState<Set<string>>(new Set());
  const [failedChapters, setFailedChapters] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  // Stable color slots: a chapter keeps its color while selected. Recompute
  // during render (not in an effect) when the selected set changes — the
  // same guard shape StackedChartPanel uses.
  const selectedKey = selectedChapters.join(",");
  const [slotsKey, setSlotsKey] = useState("");
  const [colorSlots, setColorSlots] = useState<Record<string, number>>({});
  if (selectedKey !== slotsKey) {
    setSlotsKey(selectedKey);
    setColorSlots((prev) => assignColorSlots(selectedChapters, prev, COMPARISON_COLORS.length));
  }

  const selectedLabels = useMemo(
    () => selectedChapters.map((c) => LABEL_BY_CODE.get(c) ?? c),
    [selectedChapters],
  );

  function handleChange(labels: string[]) {
    const chapters = labels.map((l) => CODE_BY_LABEL.get(l)).filter((c): c is string => !!c);
    setSelectedChapters(chapters);
    setFailedChapters((prev) => {
      const next = new Set(prev);
      chapters.forEach((c) => next.delete(c));
      return next;
    });

    const uncached = chapters.filter((c) => !loadedSeries[c] && !pendingChapters.has(c));
    if (uncached.length === 0) return;

    setPendingChapters((prev) => new Set([...prev, ...uncached]));
    startTransition(async () => {
      await Promise.all(
        uncached.map(async (chapter) => {
          try {
            const series = await fetchChapterSeries(chapter);
            setLoadedSeries((prev) => ({ ...prev, [chapter]: series }));
          } catch {
            setFailedChapters((prev) => new Set(prev).add(chapter));
          } finally {
            setPendingChapters((prev) => {
              const next = new Set(prev);
              next.delete(chapter);
              return next;
            });
          }
        }),
      );
    });
  }

  const fertiliser = loadedSeries[HIGHLIGHT_KEY];
  const visibleSeries: RuTimelineChartSeries[] = [
    ...(fertiliser ? [{ ...fertiliser, color: HIGHLIGHT_COLOR }] : []),
    ...selectedChapters
      .filter((c) => loadedSeries[c] && !failedChapters.has(c))
      .map((c) => ({
        ...loadedSeries[c],
        color: COMPARISON_COLORS[colorSlots[c] ?? 0],
      })),
  ];

  return (
    <div className="flex gap-6 flex-wrap md:flex-nowrap">
      <RuTimelineChart
        years={initialData.years}
        series={visibleSeries}
        highlightKey={HIGHLIGHT_KEY}
        markerYear={2022}
        markerMonth={2}
        markerLabel="Russia invades Ukraine"
      />
      <ProductMultiSelect
        products={PICKER_OPTIONS}
        topProducts={TOP_PRODUCTS_LABELS}
        value={selectedLabels}
        onChange={handleChange}
        max={MAX_SELECTED}
        pending={isPending}
      />
    </div>
  );
}
