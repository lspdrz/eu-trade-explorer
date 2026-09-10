import "server-only";
import { COMEXT_HEADINGS, type ComextHeading } from "@/features/sync-comext/constants/headings";
import type { ComextObservation } from "@/features/sync-comext/types";
import { replaceComextObservations } from "@/features/sync-comext/db/mutations/replaceComextObservations";
import { fetchComextImports } from "@/features/sync-comext/lib/fetchComextImports";

const START_YEAR = 2010;
const TRAILING_YEARS = 3;

type HeadingResult = { rowsWritten: number } | { error: string } | { skipped: true };

function monthList(fromYear: number, toYear: number): string[] {
  const periods: string[] = [];
  for (let y = fromYear; y <= toYear; y++) {
    for (let m = 1; m <= 12; m++) periods.push(`${y}-${String(m).padStart(2, "0")}`);
  }
  return periods;
}

/**
 * Re-pull COMEXT and replace what's on record. Runs each heading
 * independently — a failure or an upstream outage on one leaves the other's
 * data intact (see replaceComextObservations' scoping). An all-empty
 * heading is skipped, not written, so a schema change upstream can't wipe
 * good rows.
 *
 * Default: the trailing 3 calendar years, for a frequent run.
 * `mode === "backfill"`: every year from 2010 — a full table replace (the
 * delete covers all months on record for each heading), meant to run once
 * by hand via scripts/sync-comext.ts --backfill. Idempotent, so a failed
 * run is just re-run.
 */
export async function runComextRefresh(
  mode: string | null,
): Promise<Record<ComextHeading, HeadingResult>> {
  const thisYear = new Date().getFullYear();
  const fromYear =
    mode === "backfill" ? START_YEAR : thisYear - (TRAILING_YEARS - 1);
  const periods = monthList(fromYear, thisYear);

  const result = {} as Record<ComextHeading, HeadingResult>;

  for (const heading of Object.keys(COMEXT_HEADINGS) as ComextHeading[]) {
    try {
      const observations: ComextObservation[] = [];
      for (let year = fromYear; year <= thisYear; year++) {
        observations.push(...(await fetchComextImports({ heading, year })));
      }

      if (observations.length === 0) {
        result[heading] = { skipped: true };
        continue;
      }

      result[heading] = await replaceComextObservations({ heading, periods, observations });
    } catch (error) {
      result[heading] = { error: error instanceof Error ? error.message : String(error) };
    }
  }

  return result;
}
