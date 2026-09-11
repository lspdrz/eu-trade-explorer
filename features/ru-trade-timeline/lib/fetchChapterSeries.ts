"use server";

import { getComextRuYearlyTonnesByChapters } from "@/features/ru-trade-timeline/db/queries/getComextRuYearlyTonnesByChapters";
import { HS_CHAPTER_NAMES } from "@/features/ru-trade-timeline/constants/hsChapterNames";
import type { RuTimelineSeries } from "@/features/ru-trade-timeline/types";

const HUNDRED_KG_PER_TONNE = 10;
const FIRST_YEAR = 2010;
const LAST_YEAR = 2025;

/** Same fixed x-axis as getRuTradeTimelineData.ts's YEARS — every series in
 *  this feature must align to it. Duplicated rather than imported: it's a
 *  few lines of pure logic, not worth a shared module for two callers.
 *  Not exported: a "use server" file may only export async functions —
 *  exporting this plain array broke every call to fetchChapterSeries. */
const YEARS: number[] = Array.from(
  { length: LAST_YEAR - FIRST_YEAR + 1 },
  (_, i) => FIRST_YEAR + i,
);

function toYearlyValues(rows: { year: number; quantity100kg: number }[]): number[] {
  const byYear = new Map(rows.map((r) => [r.year, r.quantity100kg / HUNDRED_KG_PER_TONNE]));
  return YEARS.map((y) => byYear.get(y) ?? 0);
}

/**
 * Fetches one HS chapter's yearly series on demand — called from
 * RuTimelineControls when a visitor selects a chapter beyond the 5
 * hardcoded defaults ui/index.tsx already loaded at build time. This is
 * the one place in the feature with a genuine runtime DB dependency; the
 * base page load never calls it.
 *
 * Filters the query result to `chapter` before converting: the query is
 * always called with a single-chapter list here, so today it can only ever
 * return that one chapter's rows, but filtering explicitly means this
 * function's own correctness doesn't silently depend on the query never
 * being asked for more than one chapter — a future change on either side
 * can't quietly start blending another chapter's tonnage into this series.
 */
export async function fetchChapterSeries(chapter: string): Promise<RuTimelineSeries> {
  const rows = await getComextRuYearlyTonnesByChapters([chapter]);
  const ownRows = rows.filter((r) => r.chapter === chapter);
  return {
    key: chapter,
    label: HS_CHAPTER_NAMES[chapter] ?? chapter,
    values: toYearlyValues(ownRows),
  };
}
