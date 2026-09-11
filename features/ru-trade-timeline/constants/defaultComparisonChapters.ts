/**
 * Chapters excluded from every candidate list this feature offers: 28 and
 * 31 overlap with fertiliser's own headings (2814 sits inside 28, 3102 is
 * most of 31), 99 is "Other products" — an administrative catch-all, not a
 * real export category.
 */
export const EXCLUDED_CHAPTERS = ["28", "31", "99"];

/**
 * The 5 HS chapters with the highest peak single-year RU import volume,
 * 2010-2025, excluding EXCLUDED_CHAPTERS. Determined once by direct query
 * against raw_comext_ru_imports (see
 * docs/superpowers/specs/2026-09-11-ru-trade-timeline-multiseries-design.md):
 *
 *   27 Mineral fuels...        peak 315,482,060 t
 *   44 Wood and articles...    peak  13,632,178 t
 *   72 Iron and steel          peak  12,201,602 t
 *   26 Ores, slag and ash      peak  10,584,964 t
 *   29 Organic chemicals       peak   3,594,837 t
 *
 * This is a fact about trade history, not a computation the app repeats —
 * re-derive by hand only if the backfilled data changes enough to
 * plausibly reorder it.
 * 
 * 27 is excluded from the default comparison chapters because it skews the
 * chart due to its large data compared to the others
 */
export const DEFAULT_COMPARISON_CHAPTERS = ["44", "72", "26", "29"];
export const TOP_COMPARISON_CHAPTERS = ["27", "44", "72", "26", "29"];
