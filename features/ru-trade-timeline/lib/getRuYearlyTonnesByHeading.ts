import "server-only";
import { getAllComextRuRows } from "@/features/ru-trade-timeline/db/queries/getAllComextRuRows";
import type {
  HeadingGroup,
  RuTimelineData,
  RuYearRow,
} from "@/features/ru-trade-timeline/types";

const HUNDRED_KG_PER_TONNE = 10;

/**
 * Reads every RU import row and rolls it up into named comparison series.
 * Which HS chapters/headings form which series is entirely the `groups`
 * parameter — never baked into the query or this function — so choosing
 * "fertiliser vs. everything else" vs. a different comparison later is a
 * one-line change to the build script's config, not a re-fetch.
 */
export async function getRuYearlyTonnesByHeading(
  groups: HeadingGroup[],
): Promise<RuTimelineData> {
  return aggregateRuYearlyTonnes(await getAllComextRuRows(), groups);
}

/**
 * Collapses monthly, per-CN8 rows into yearly tonnes per named group. A row
 * belongs to the first group (in `groups` order) whose `cn8Prefixes` it
 * matches; a group with no `cn8Prefixes` (at most one — a catch-all)
 * collects every row no other group claimed. `years` spans the full
 * min..max year present in the data, zero-filled for any gap year, so
 * every series' `values` array aligns to it index-for-index. Exported
 * alongside its only caller so it stays unit-testable without a database,
 * same pattern as aggregateComextYearlyTonnes.
 */
export function aggregateRuYearlyTonnes(
  rows: RuYearRow[],
  groups: HeadingGroup[],
): RuTimelineData {
  const catchAll = groups.find((g) => !g.cn8Prefixes || g.cn8Prefixes.length === 0);
  const prefixed = groups.filter((g) => g.cn8Prefixes && g.cn8Prefixes.length > 0);

  const byGroupYear = new Map<string, Map<number, number>>();
  for (const g of groups) byGroupYear.set(g.key, new Map());

  let minYear = Infinity;
  let maxYear = -Infinity;

  for (const row of rows) {
    const year = Number(row.period.slice(0, 4));
    minYear = Math.min(minYear, year);
    maxYear = Math.max(maxYear, year);

    const group =
      prefixed.find((g) => g.cn8Prefixes!.some((p) => row.cn8ProductCode.startsWith(p))) ??
      catchAll;
    if (!group) continue;

    const tonnes = row.quantity100kg / HUNDRED_KG_PER_TONNE;
    const byYear = byGroupYear.get(group.key)!;
    byYear.set(year, (byYear.get(year) ?? 0) + tonnes);
  }

  if (!Number.isFinite(minYear)) {
    return { years: [], series: groups.map((g) => ({ key: g.key, label: g.label, values: [] })) };
  }

  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);
  const series = groups.map((g) => ({
    key: g.key,
    label: g.label,
    values: years.map((y) => byGroupYear.get(g.key)!.get(y) ?? 0),
  }));

  return { years, series };
}
