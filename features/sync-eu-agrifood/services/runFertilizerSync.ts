import "server-only";
import { peekFirst } from "../utils/peekFirst";
import { replaceProductData } from "../db/mutations/replaceProductData";
import { fetchWeeklyImports } from "./fetchWeeklyImports";

const PRODUCTS = [
  "Ammonia",
  "AN - Ammonium nitrate",
  "AS - Ammonium sulphate",
  "CAN - Calcium Ammonium Nitrate",
  "UAN - Urea Ammonium nitrate",
  "Urea",
  "Nitrogenous fertilisers - other",
];

/**
 * Runs the sync for every hardcoded product.
 *
 * Fetches each product, peeks the stream (`../utils/peekFirst.ts`) to check
 * for real data, and only then hands it to `replaceProductData` to write.
 * A fetch that yields nothing is reported as `skipped: true` without
 * calling `replaceProductData` at all — "zero rows" is ambiguous
 * (genuinely no trade vs. a query that no longer matches anything
 * upstream, see the 2026-09-07 incident in architecture-decisions.md),
 * and only the first case should delete real existing data.
 *
 * Default mode replaces just the current `marketingYear`, for a frequent
 * schedule. `mode === "backfill"` replaces each product's entire history
 * — meant to run manually, once, when a product is first added.
 */
export async function runFertilizerSync(
  mode: string | null,
): Promise<Record<string, { rowsWritten: number; skipped: boolean }>> {
  const marketingYear = mode === "backfill" ? undefined : String(new Date().getFullYear());

  const results: Record<string, { rowsWritten: number; skipped: boolean }> = {};
  for (const product of PRODUCTS) {
    const source = fetchWeeklyImports({
      product,
      marketingYears: marketingYear ? [marketingYear] : undefined,
    });

    const peeked = await peekFirst(source);

    if (peeked.empty) {
      results[product] = { rowsWritten: 0, skipped: true };
      continue;
    }

    const { rowsWritten } = await replaceProductData({
      product,
      marketingYear,
      source: peeked.combined,
    });
    results[product] = { rowsWritten, skipped: false };
  }
  return results;
}
