import "server-only";
import { Agent, fetch } from "undici";

const BASE_URL = "https://api.tech.ec.europa.eu/agrifood";

// Node's global `fetch` has a fixed 300s timeout that can't be
// reconfigured directly — a custom Agent from the standalone undici
// package isn't compatible with Node's internal bundled copy (confirmed:
// throws a version-mismatch error). Importing fetch from undici too,
// paired with an Agent from the same package, avoids that mismatch. The
// longer timeout is needed for real reasons: this API has been observed
// taking minutes, not seconds, during degraded periods.
const httpAgent = new Agent({ headersTimeout: 600_000, bodyTimeout: 600_000 });

/**
 * Sends a GET request to the EU Agri-food Data Portal API and returns the
 * raw `Response` — this file only contacts the external system. It knows
 * nothing about any specific endpoint, param, or response shape; that's
 * sync policy, owned by whichever feature calls this (see
 * features/sync-eu-agrifood/services/fetchWeeklyImports.ts).
 *
 * Must only run server-side: the API sends no CORS headers, so a browser
 * would block the response.
 */
export async function contactEUAPI(path: string, searchParams?: URLSearchParams) {
  const url = new URL(`${BASE_URL}${path}`);
  if (searchParams) {
    url.search = searchParams.toString();
  }

  return fetch(url, {
    headers: { Accept: "application/json" },
    dispatcher: httpAgent,
  });
}
