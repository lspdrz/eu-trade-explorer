const FIRST_YEAR = 2010;
const LAST_YEAR = 2025;

/**
 * The fixed, shared x-axis every series in this feature aligns to — the
 * page's build-time defaults (getRuTradeTimelineData.ts) and any chapter
 * fetched on demand (fetchChapterSeries.ts) must all use this exact same
 * range, since each comes from an independent query that could otherwise
 * span a different actual year range (e.g. a rarely-traded chapter),
 * leaving series that don't line up on one chart. Caps at 2025 rather than
 * the current year: the raw table's latest rows are always a partial year
 * (Eurostat publishes with a lag), which would render as a misleading
 * cliff-drop.
 *
 * Deliberately its own module with no other imports: fetchChapterSeries.ts
 * is a "use server" file and must stay cheap to import — pulling YEARS in
 * from getRuTradeTimelineData.ts instead would drag that file's own
 * getComextRuYearlyTonnesByPrefixes import (and, transitively, the DB
 * client, which throws at import time without DATABASE_URL) along with it.
 */
export const YEARS: number[] = Array.from(
  { length: LAST_YEAR - FIRST_YEAR + 1 },
  (_, i) => FIRST_YEAR + i,
);
