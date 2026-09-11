"use server";

import { getComextRuYearlyTonnesByChapters } from "@/features/ru-trade-timeline/db/queries/getComextRuYearlyTonnesByChapters";
import { HS_CHAPTER_NAMES } from "@/features/ru-trade-timeline/constants/hsChapterNames";
import { toYearlyValues } from "@/features/ru-trade-timeline/lib/years";
import type { RuTimelineSeries } from "@/features/ru-trade-timeline/types";

/**
 * Fetches one HS chapter's yearly series on demand — called from
 * RuTimelineControls when a visitor selects a chapter beyond the 5
 * hardcoded defaults ui/index.tsx already loaded at build time. This is
 * the one place in the feature with a genuine runtime DB dependency; the
 * base page load never calls it.
 */
export async function fetchChapterSeries(chapter: string): Promise<RuTimelineSeries> {
  const rows = await getComextRuYearlyTonnesByChapters([chapter]);
  return {
    key: chapter,
    label: HS_CHAPTER_NAMES[chapter] ?? chapter,
    values: toYearlyValues(rows),
  };
}
