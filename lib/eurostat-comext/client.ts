import "server-only";
import { Agent, fetch } from "undici";

// Eurostat COMEXT dataset DS-045409 — "EU trade since 1988 by HS2-4-6 and
// CN8". Chosen over the sibling datasets carrying the same trade under other
// classifications (SITC / BEC / CPA) because it's keyed by CN8, matching the
// product identifier the surveillance data uses. Reached via the
// COMEXT-specific dissemination API (separate from, and less documented
// than, the main Eurostat one); `?format=JSON` returns JSON-stat.
//
//   Dataset:  https://ec.europa.eu/eurostat/databrowser/product/page/DS-045409
//   Method:   https://ec.europa.eu/eurostat/cache/metadata/en/ext_go_detail_sims.htm
//   API:      https://ec.europa.eu/eurostat/web/user-guides/data-browser/api-data-access/api-getting-started/comext-database
const BASE_URL =
  "https://ec.europa.eu/eurostat/api/comext/dissemination/statistics/1.0/data/DS-045409";

// Eurostat's COMEXT API is slow (30-45s per call is normal) and has
// documented multi-hour degraded windows. Node's global fetch has a fixed
// 300s timeout that can't be reconfigured; importing fetch + Agent from
// undici together (same as lib/eu-agrifood-api/client.ts) lets us raise it.
const httpAgent = new Agent({ headersTimeout: 600_000, bodyTimeout: 600_000 });

/**
 * GETs the Eurostat COMEXT DS-045409 dataset ("EU trade since 1988 by
 * HS2-4-6 and CN8"). Returns the raw undici `Response` — this file only
 * contacts the external system; it knows nothing about JSON-stat, the
 * query params, or fertilisers (that's features/sync-comext/).
 *
 * Must run server-side: no CORS headers on the response.
 */
export async function contactComextAPI(searchParams?: URLSearchParams) {
  const url = new URL(BASE_URL);
  if (searchParams) url.search = searchParams.toString();

  return fetch(url, {
    headers: { Accept: "application/json" },
    dispatcher: httpAgent,
  });
}
