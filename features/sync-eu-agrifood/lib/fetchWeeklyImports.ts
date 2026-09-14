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

  // A source-stream failure (e.g. a mid-backfill connection reset) should
  // reach the caller as a thrown error, not a silently truncated result.
  // Piping an errored source into `writable` normally aborts it, which in
  // turn errors `readable` — surfacing the failure through the `for await`
  // below without any help from this catch. But that chain depends on
  // stream-json's TransformStream propagating an aborted writable into an
  // errored readable, which isn't guaranteed by the Streams spec for every
  // implementation; if it ever doesn't, `readable` would just end cleanly
  // with fewer rows than the source actually had. Recording the rejection
  // here and re-throwing it once the loop below ends (rather than only
  // suppressing it) means the caller finds out either way.
  let pipeError: unknown;
  const pipeDone = response.body.pipeTo(writable).catch((error) => {
    pipeError = error;
  });

  try {
    for await (const { value } of readable) {
      yield value as RawTaxudWeekRow;
    }
  } finally {
    await pipeDone;
  }

  if (pipeError) {
    throw pipeError instanceof Error ? pipeError : new Error(String(pipeError));
  }
}
