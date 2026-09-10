import "server-only";
import { contactComextAPI } from "@/lib/eurostat-comext/client";
import { COMEXT_HEADINGS, type ComextHeading } from "../constants/headings";
import type { ComextObservation } from "../types";
import { parseComextCsv } from "./parseComextCsv";

/**
 * Fetches one heading's COMEXT monthly import observations for a single
 * calendar year: EU-27 aggregate, imports, all partners, every CN8 code
 * under the heading, both measures.
 *
 * One (heading, year) call stays synchronously under the size cap — a wider
 * request comes back queued as an async job. Any non-200 throws; there's no
 * in-process retry (the API's degraded windows outlast one).
 */
export async function fetchComextImports({
  heading,
  year,
}: {
  heading: ComextHeading;
  year: number;
}): Promise<ComextObservation[]> {
  const params = new URLSearchParams({
    "c[flow]": "1",
    "c[indicators]": "QUANTITY_IN_100KG,VALUE_IN_EUROS",
    "c[product]": COMEXT_HEADINGS[heading].join(","),
    "c[TIME_PERIOD]": `ge:${year}-01+le:${year}-12`,
    format: "csvdata",
  });

  const response = await contactComextAPI(params);
  if (!response.ok) {
    throw new Error(
      `COMEXT request failed for heading ${heading} ${year}: ${response.status} ${response.statusText}`,
    );
  }

  return parseComextCsv(await response.text());
}
