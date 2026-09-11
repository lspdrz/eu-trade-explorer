/**
 * One monthly COMEXT import observation for partner=RU, parsed from the
 * SDMX-3.0 CSV feed and stored verbatim in `raw_comext_ru_imports`
 * (lib/db/schemas/rawComextRuImports.ts). No partnerCode field — every
 * observation this feature ever writes is RU, so the mutation sets it,
 * callers don't pass it.
 */
export interface ComextRuObservation {
  cn8ProductCode: string;
  /** "YYYY-MM". */
  period: string;
  quantity100kg: number | null;
  valueEuros: number | null;
}

/**
 * One raw RU import row trimmed to what yearly aggregation needs, with the
 * numeric-as-string quantity converted to a real number (NULL -> 0).
 * Returned by getAllComextRuRows, consumed by getRuYearlyTonnesByHeading.
 */
export interface RuYearRow {
  cn8ProductCode: string;
  period: string; // "YYYY-MM"
  quantity100kg: number;
}

/**
 * One named comparison series for the chart, defined by which CN8
 * prefixes (HS chapter "28" or heading "2814") belong to it. A group with
 * no `cn8Prefixes` (at most one per list — a catch-all) collects every row
 * no other group claimed, which is what makes "fertiliser vs. everything
 * else" expressible without listing every other chapter.
 */
export interface HeadingGroup {
  key: string;
  label: string;
  cn8Prefixes?: string[];
}

/** One series' yearly tonnes, aligned index-for-index with RuTimelineData.years. */
export interface RuTimelineSeries {
  key: string;
  label: string;
  values: number[];
}

/** The chart's full input — also the shape of the checked-in static JSON. */
export interface RuTimelineData {
  years: number[];
  series: RuTimelineSeries[];
}
