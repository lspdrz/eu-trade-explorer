/**
 * One-time COMEXT backfill: 2010 -> current year, per (year, heading), each
 * its own transaction.
 *
 *   npx tsx --conditions=react-server --env-file=.env.local scripts/comext-backfill.ts             # from 2010
 *   npx tsx --conditions=react-server --env-file=.env.local scripts/comext-backfill.ts --from=2018  # resume
 *
 * --env-file loads DATABASE_URL *before* the module graph (so @/lib/db/client,
 * which reads process.env at import time, sees it). Standalone scripts don't
 * get Next's automatic .env.local loading. ~12-15 min — this is why it's a
 * script, not a route: the runtime exceeds any serverless budget, and it
 * runs exactly once.
 */
import { COMEXT_HEADINGS, type ComextHeading } from "@/features/sync-comext/constants/headings";
import { replaceComextObservations } from "@/features/sync-comext/db/mutations/replaceComextObservations";
import { fetchComextImports } from "@/features/sync-comext/services/fetchComextImports";

const START_YEAR = 2010;

function monthsOf(year: number): string[] {
  return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
}

async function main() {
  const fromArg = process.argv.find((a) => a.startsWith("--from="));
  const fromYear = fromArg ? Number(fromArg.split("=")[1]) : START_YEAR;
  const thisYear = new Date().getFullYear();
  const headings = Object.keys(COMEXT_HEADINGS) as ComextHeading[];

  for (let year = fromYear; year <= thisYear; year++) {
    const parts: string[] = [];
    for (const heading of headings) {
      const observations = await fetchComextImports({ heading, year });
      if (observations.length === 0) {
        parts.push(`${heading}: (empty, skipped)`);
        continue;
      }
      const { rowsWritten } = await replaceComextObservations({
        heading,
        periods: monthsOf(year),
        observations,
      });
      parts.push(`${heading}: ${rowsWritten} rows`);
    }
    console.log(`${year}  ${parts.join("  ")}`);
  }
  console.log("done");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
