import "server-only";
import { streamArray } from "stream-json/web/streamers/stream-array.js";
import { contactEUAPI } from "@/lib/eu-agrifood-api/client";
import type { RawTaxudWeekRow } from "@/features/sync-eu-agrifood/types";

// numberAsString stringifies every numeric field, not just the
// precision-sensitive ones — this converts week/procedure/preference
// back to number (safe, small integers), leaving the five value fields
// as exact strings.
const INTEGER_FIELDS = new Set(["week", "procedure", "preference"]);
function reviveIntegerFields(key: string, value: unknown) {
  return typeof value === "string" && INTEGER_FIELDS.has(key) ? Number(value) : value;
}

/**
 * Streams weekly EU import trade rows for a product, optionally restricted
 * to a set of partner countries. Parses incrementally rather than
 * buffering with `response.json()`, keeping memory bounded regardless of
 * dataset size.
 *
 * Omitting `partnerCodes` returns every partner country; omitting
 * `marketingYears` returns the full history (2011-present). The correct
 * query param is `marketingYears` (plural, camelCase) — confirmed live,
 * since the API's own docs don't state it and wrong names are silently
 * ignored rather than rejected.
 *
 * Yields nothing on a 404 (the API's "no results" response) rather than
 * treating it as an error.
 */
export async function* fetchWeeklyImports(params: {
  product: string;
  partnerCodes?: string[];
  marketingYears?: string[];
}): AsyncGenerator<RawTaxudWeekRow> {
  const searchParams = new URLSearchParams();
  searchParams.set("products", params.product);
  for (const code of params.partnerCodes ?? []) {
    searchParams.append("partnerCodes", code);
  }
  for (const year of params.marketingYears ?? []) {
    searchParams.append("marketingYears", year);
  }

  const response = await contactEUAPI("/api/taxud/weeklyData/import", searchParams);

  if (response.status === 404) {
    return;
  }

  if (!response.ok || !response.body) {
    throw new Error(
      `Agri-food API request failed: ${response.status} ${response.statusText}`,
    );
  }

  const { readable, writable } = streamArray.withParserAsWebStream({
    numberAsString: true,
    reviver: reviveIntegerFields,
  });
  response.body.pipeTo(writable).catch(() => {
    // Errors already surface to the caller via the `readable` stream's
    // `for await` loop below; this only exists to prevent an unhandled
    // promise rejection for the same error.
  });

  for await (const { value } of readable) {
    yield value as RawTaxudWeekRow;
  }
}
