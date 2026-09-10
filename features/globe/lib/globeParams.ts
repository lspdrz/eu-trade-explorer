import { MAX_GLOBE_COUNTRIES } from "@/features/globe/constants/globeConfig";

const WELL_FORMED = /^[A-Z]{2}$/;

/**
 * The `?countries=` selection — a comma list of 2-letter partner codes.
 * Never throws; structure only (split, upper-case, dedupe, well-formed
 * filter, cap). An empty or absent param yields `[]` (→ the implicit
 * top-N; see `resolveActive`).
 */
export function parseGlobeCountries(params: URLSearchParams): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of (params.get("countries") ?? "").split(",")) {
    const code = part.trim().toUpperCase();
    if (!code || seen.has(code) || !WELL_FORMED.test(code)) continue;
    seen.add(code);
    out.push(code);
    if (out.length === MAX_GLOBE_COUNTRIES) break;
  }
  return out;
}

/** Inverse of `parseGlobeCountries`. Empty list → no param (bare `/globe`). */
export function serializeGlobeCountries(codes: string[]): URLSearchParams {
  const params = new URLSearchParams();
  if (codes.length > 0) params.set("countries", codes.join(","));
  return params;
}
