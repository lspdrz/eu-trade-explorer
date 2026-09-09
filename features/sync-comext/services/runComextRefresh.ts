import "server-only";
import { COMEXT_HEADINGS, type ComextHeading } from "../constants/headings";
import type { ComextObservation } from "../types";
import { replaceComextObservations } from "../db/mutations/replaceComextObservations";
import { fetchComextImports } from "./fetchComextImports";

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
 * The monthly refresh: re-pull the trailing 3 calendar years from COMEXT
 * and replace them. Runs each heading independently — a failure or an
 * upstream outage on one leaves the other's data intact (see
 * replaceComextObservations' scoping). An all-empty heading is skipped,
 * not written, so a schema change upstream can't wipe good rows.
 */
export async function runComextRefresh(): Promise<Record<ComextHeading, HeadingResult>> {
  const thisYear = new Date().getFullYear();
  const fromYear = thisYear - (TRAILING_YEARS - 1);
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
