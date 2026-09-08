import type { YearlyPartnerTotal } from "../../types";

export const MAX_COUNTRIES = 3;
export const DEFAULT_PRODUCT = "Ammonia";

export interface ChartSelection {
  product: string;
  partnerCodes: string[];
  fromYear: number;
  toYear: number;
}

export interface SelectionBounds {
  products: string[];
  partners: { code: string; name: string }[];
  years: number[];
}

/**
 * The parts of `SelectionBounds` derivable from one product's dataset: which
 * partners have data for it (name-sorted) and which years it spans (ascending).
 * The caller adds `products` (a separate dataset) to complete the bounds.
 * `parseChartSelection` sanitises URL params against the full bounds.
 */
export function deriveBounds(
  yearlyTotals: YearlyPartnerTotal[],
): Pick<SelectionBounds, "partners" | "years"> {
  const partnersByCode = new Map<string, string>();
  const yearSet = new Set<number>();
  for (const total of yearlyTotals) {
    partnersByCode.set(total.partnerCode, total.partner);
    yearSet.add(Number(total.year));
  }

  const partners = [...partnersByCode.entries()]
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const years = [...yearSet].sort((a, b) => a - b);

  return { partners, years };
}

function spanEnds(years: number[]): [number, number] {
  if (years.length === 0) return [0, 0];
  return [years[0], years[years.length - 1]];
}

function parseYear(
  raw: string | null,
  fallback: number,
  minYear: number,
  maxYear: number,
): number {
  const n = Number(raw);
  if (!raw || !Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.trunc(n), minYear), maxYear);
}

const WELL_FORMED_CODE = /^[A-Z]{2}$/;

/**
 * Parse raw URL params into a valid ChartSelection. Never throws: an unknown
 * product becomes the default, years are clamped to the data's span and
 * swapped if crossed.
 *
 * Country codes are kept if they're a partner with data for the current
 * product OR a well-formed 2-letter code that simply has no rows for it — the
 * latter still renders as an explicit zero bar (the spec's "the absence is
 * shown, never silent"), rather than being dropped like true garbage.
 */
export function parseChartSelection(
  params: URLSearchParams,
  bounds: SelectionBounds,
): ChartSelection {
  const [minYear, maxYear] = spanEnds(bounds.years);

  const rawProduct = params.get("product");
  const product =
    rawProduct && bounds.products.includes(rawProduct) ? rawProduct : DEFAULT_PRODUCT;

  const validCodes = new Set(bounds.partners.map((p) => p.code));
  const seen = new Set<string>();
  const partnerCodes: string[] = [];
  for (const raw of (params.get("countries") ?? "").split(",")) {
    const code = raw.trim().toUpperCase();
    if (!code || seen.has(code)) continue;
    if (!validCodes.has(code) && !WELL_FORMED_CODE.test(code)) continue;
    seen.add(code);
    partnerCodes.push(code);
    if (partnerCodes.length === MAX_COUNTRIES) break;
  }

  let fromYear = parseYear(params.get("from"), minYear, minYear, maxYear);
  let toYear = parseYear(params.get("to"), maxYear, minYear, maxYear);
  if (fromYear > toYear) [fromYear, toYear] = [toYear, fromYear];

  return { product, partnerCodes, fromYear, toYear };
}

/**
 * The inverse of parseChartSelection. Params equal to their default are
 * omitted, so the canonical view has a clean URL.
 */
export function chartSelectionToParams(
  selection: ChartSelection,
  bounds: SelectionBounds,
): URLSearchParams {
  const [minYear, maxYear] = spanEnds(bounds.years);
  const params = new URLSearchParams();

  if (selection.product !== DEFAULT_PRODUCT) params.set("product", selection.product);
  if (selection.partnerCodes.length > 0)
    params.set("countries", selection.partnerCodes.join(","));
  if (selection.fromYear !== minYear) params.set("from", String(selection.fromYear));
  if (selection.toYear !== maxYear) params.set("to", String(selection.toYear));

  return params;
}
