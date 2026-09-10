import type { ComextObservation } from "@/features/sync-comext/types";

/**
 * Parses Eurostat's SDMX-3.0 fully-long CSV (COMEXT DS-045409) into flat
 * observations — one per (product, partner, period) that has at least one
 * indicator, with the quantity and value rows folded together.
 *
 * Column order is read from the header, not assumed. No quoting or escaping
 * in this feed (verified across ~9.5k rows), so a plain split on "," is
 * safe. An `indicators` value other than the two we request is ignored.
 */
export function parseComextCsv(csv: string): ComextObservation[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const header = lines[0].split(",");
  const iProduct = header.indexOf("product");
  const iPartner = header.indexOf("partner");
  const iIndicator = header.indexOf("indicators");
  const iPeriod = header.indexOf("TIME_PERIOD");
  const iValue = header.indexOf("OBS_VALUE");

  const byKey = new Map<string, ComextObservation>();
  for (let i = 1; i < lines.length; i++) {
    const f = lines[i].split(",");
    const indicator = f[iIndicator];
    if (indicator !== "QUANTITY_IN_100KG" && indicator !== "VALUE_IN_EUROS") continue;

    const product = f[iProduct];
    const partner = f[iPartner];
    const period = f[iPeriod];
    const key = `${product}|${partner}|${period}`;

    let obs = byKey.get(key);
    if (!obs) {
      obs = {
        cn8ProductCode: product,
        partnerCode: partner,
        period,
        quantity100kg: null,
        valueEuros: null,
      };
      byKey.set(key, obs);
    }

    const n = Number(f[iValue]);
    if (indicator === "QUANTITY_IN_100KG") obs.quantity100kg = n;
    else obs.valueEuros = n;
  }

  return [...byKey.values()];
}
