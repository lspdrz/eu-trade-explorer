import "server-only";
import { getComextRuYearlyTonnesByChapters } from "@/features/ru-trade-timeline/db/queries/getComextRuYearlyTonnesByChapters";
import { getComextRuYearlyTonnesByPrefixes } from "@/features/ru-trade-timeline/db/queries/getComextRuYearlyTonnesByPrefixes";
import { DEFAULT_COMPARISON_CHAPTERS } from "@/features/ru-trade-timeline/constants/defaultComparisonChapters";
import { HS_CHAPTER_NAMES } from "@/features/ru-trade-timeline/constants/hsChapterNames";
import { YEARS, toYearlyValues } from "@/features/ru-trade-timeline/lib/years";
import type { RuTimelineData } from "@/features/ru-trade-timeline/types";

const FERTILISER_PREFIXES = ["2814", "3102"];
const FERTILISER_LABEL = "Fertiliser (ammonia + nitrogenous, HS 2814/3102)";

/**
 * The page's initial, build-time data: fertiliser plus the 5 hardcoded
 * default chapters, each from its own small targeted SQL query — never a
 * pull of the full raw_comext_ru_imports table. Called once, at
 * `next build` time, by ui/index.tsx (a plain, non-force-dynamic Server
 * Component) — additional chapters beyond these 5 are fetched on demand by
 * the fetchChapterSeries Server Action (lib/actions.ts), not here.
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
