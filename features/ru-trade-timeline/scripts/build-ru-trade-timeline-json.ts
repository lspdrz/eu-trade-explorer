/**
 * ONE-OFF. Reads raw_comext_ru_imports (populated by
 * features/ru-trade-timeline/scripts/comext-ru-backfill.ts) and writes the
 * small static JSON the chart page imports directly —
 * features/ru-trade-timeline/data/ru-trade-timeline.json. Re-run only if
 * the underlying table changes or GROUPS below changes; the page never
 * queries the database itself.
 *
 * GROUPS is the "what plays alongside fertiliser" choice, deferred during
 * design until the full raw series was available. This starts with the
 * simplest contrast (fertiliser vs. everything else) — edit the list and
 * re-run to compare against something else instead (no re-fetch needed,
 * this only reads the already-backfilled table).
 *
 * Run:
 *   npx tsx --conditions=react-server --env-file=.env.local features/ru-trade-timeline/scripts/build-ru-trade-timeline-json.ts
 */
import { writeFileSync } from "node:fs";
import { getRuYearlyTonnesByHeading } from "@/features/ru-trade-timeline/lib/getRuYearlyTonnesByHeading";
import type { HeadingGroup, RuTimelineData } from "@/features/ru-trade-timeline/types";

const OUT_PATH = "features/ru-trade-timeline/data/ru-trade-timeline.json";

// The fixed historical story this chart tells — "2010-2025" is named in the
// page title and the design doc. The raw table's latest rows are always a
// partial current year (Eurostat publishes with a lag), which would render
// as a misleading cliff-drop rather than a real trend if left in.
const LAST_FULL_YEAR = 2025;

const GROUPS: HeadingGroup[] = [
  {
    key: "fertiliser",
    label: "Fertiliser (ammonia + nitrogenous, HS 2814/3102)",
    cn8Prefixes: ["2814", "3102"],
  },
  { key: "rest", label: "Everything else" },
];

function trimToFullYears(data: RuTimelineData, lastFullYear: number): RuTimelineData {
  const cutoff = data.years.findIndex((y) => y > lastFullYear);
  const end = cutoff === -1 ? data.years.length : cutoff;
  return {
    years: data.years.slice(0, end),
    series: data.series.map((s) => ({ ...s, values: s.values.slice(0, end) })),
  };
}

async function main(): Promise<void> {
  const full = await getRuYearlyTonnesByHeading(GROUPS);
  const data = trimToFullYears(full, LAST_FULL_YEAR);
  writeFileSync(OUT_PATH, JSON.stringify(data, null, 2) + "\n");
  console.log(`wrote ${data.years.length} years x ${data.series.length} series -> ${OUT_PATH}`);
  for (const s of data.series) {
    console.log(`  ${s.key}: ${s.values.map((v) => Math.round(v)).join(", ")}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
