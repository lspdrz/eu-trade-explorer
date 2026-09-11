import "server-only";
import { getComextRuYearlyTonnesByChapters } from "@/features/ru-trade-timeline/db/queries/getComextRuYearlyTonnesByChapters";
import { getComextRuYearlyTonnesByPrefixes } from "@/features/ru-trade-timeline/db/queries/getComextRuYearlyTonnesByPrefixes";
import { DEFAULT_COMPARISON_CHAPTERS } from "@/features/ru-trade-timeline/constants/defaultComparisonChapters";
import { HS_CHAPTER_NAMES } from "@/features/ru-trade-timeline/constants/hsChapterNames";
import type { RuTimelineData } from "@/features/ru-trade-timeline/types";

const FERTILISER_PREFIXES = ["2814", "3102"];
const FERTILISER_LABEL = "Fertiliser (ammonia + nitrogenous, HS 2814/3102)";

const HUNDRED_KG_PER_TONNE = 10;
const FIRST_YEAR = 2010;
const LAST_YEAR = 2025;

/**
 * The fixed, shared x-axis every series in this feature aligns to. Fixed
 * (not derived per-query) because each series comes from an independent
 * SQL query that could span a different actual year range (e.g. a rarely-
 * traded chapter) — without a shared range, series wouldn't line up on one
 * chart. Caps at 2025 rather than the current year: the raw table's latest
 * rows are always a partial year (Eurostat publishes with a lag), which
 * would render as a misleading cliff-drop.
 */
export const YEARS: number[] = Array.from(
  { length: LAST_YEAR - FIRST_YEAR + 1 },
  (_, i) => FIRST_YEAR + i,
);

/**
 * Converts a sparse (year, quantity100kg) result into a dense, tonnes-
 * converted array aligned index-for-index with YEARS. A year outside YEARS
 * (the current partial year) is silently dropped, not clamped into range.
 */
function toYearlyValues(rows: { year: number; quantity100kg: number }[]): number[] {
  const byYear = new Map(rows.map((r) => [r.year, r.quantity100kg / HUNDRED_KG_PER_TONNE]));
  return YEARS.map((y) => byYear.get(y) ?? 0);
}

/**
 * The page's initial, build-time data: fertiliser plus the 5 hardcoded
 * default chapters, each from its own small targeted SQL query — never a
 * pull of the full raw_comext_ru_imports table. Called once, at
 * `next build` time, by ui/index.tsx (a plain, non-force-dynamic Server
 * Component) — additional chapters beyond these 5 are fetched on demand by
 * the fetchChapterSeries Server Action, not here.
 */
export async function getRuTradeTimelineData(): Promise<RuTimelineData> {
  const [fertiliserRows, chapterRows] = await Promise.all([
    getComextRuYearlyTonnesByPrefixes(FERTILISER_PREFIXES),
    getComextRuYearlyTonnesByChapters(DEFAULT_COMPARISON_CHAPTERS),
  ]);

  const fertiliser = {
    key: "fertiliser",
    label: FERTILISER_LABEL,
    values: toYearlyValues(fertiliserRows),
  };

  const chapters = DEFAULT_COMPARISON_CHAPTERS.map((chapter) => ({
    key: chapter,
    label: HS_CHAPTER_NAMES[chapter] ?? chapter,
    values: toYearlyValues(chapterRows.filter((r) => r.chapter === chapter)),
  }));

  return { years: YEARS, series: [fertiliser, ...chapters] };
}
