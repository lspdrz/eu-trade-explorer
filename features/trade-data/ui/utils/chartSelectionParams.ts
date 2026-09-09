import type { ChartView, TradeSource, YearlyPartnerTotal } from "../../types";

export const MAX_COUNTRIES = 3;
export const MAX_PRODUCTS = 3;
export const DEFAULT_PRODUCT = "Ammonia";
export const DEFAULT_SOURCE: TradeSource = "comext";
export const DEFAULT_VIEW: ChartView = "countries";

export interface ChartSelection {
  source: TradeSource;
  view: ChartView;
  // "Compare countries" tab
  product: string;
  partnerCodes: string[];
  // "Compare products" tab
  partner: string;
  products: string[];
  // shared
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
 * Parse raw URL params into a valid ChartSelection. Never throws: unknown
 * source / view / product / partner become defaults, years are clamped to
 * the data's span and swapped if crossed.
 *
 * `source` and `view` are resolved first — they decide which dataset the RSC
 * fetched, so `bounds` already reflects them by the time the rest is
 * validated. Both tabs' fields are parsed regardless of `view` (they coexist
 * in the URL).
 *
 * Country codes are kept if they're a known partner OR a well-formed
 * 2-letter code with no rows — the latter still renders as an explicit zero
 * bar (the spec's "the absence is shown, never silent") rather than being
 * dropped like true garbage. The single `partner` (products tab) must be a
 * known partner or it's `""`.
 */
export function parseChartSelection(
  params: URLSearchParams,
  bounds: SelectionBounds,
): ChartSelection {
  const source: TradeSource =
    params.get("source") === "surveillance" ? "surveillance" : "comext";
  const view: ChartView = params.get("view") === "products" ? "products" : "countries";

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

  const rawPartner = (params.get("partner") ?? "").trim().toUpperCase();
  const partner = validCodes.has(rawPartner) ? rawPartner : "";

  const productSet = new Set(bounds.products);
  const seenProducts = new Set<string>();
  const products: string[] = [];
  for (const raw of (params.get("products") ?? "").split(",")) {
    const p = raw.trim();
    if (!p || seenProducts.has(p) || !productSet.has(p)) continue;
    seenProducts.add(p);
    products.push(p);
    if (products.length === MAX_PRODUCTS) break;
  }

  let fromYear = parseYear(params.get("from"), minYear, minYear, maxYear);
  let toYear = parseYear(params.get("to"), maxYear, minYear, maxYear);
  if (fromYear > toYear) [fromYear, toYear] = [toYear, fromYear];

  return { source, view, product, partnerCodes, partner, products, fromYear, toYear };
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

  if (selection.source !== DEFAULT_SOURCE) params.set("source", selection.source);
  if (selection.view !== DEFAULT_VIEW) params.set("view", selection.view);
  if (selection.product !== DEFAULT_PRODUCT) params.set("product", selection.product);
  if (selection.partnerCodes.length > 0)
    params.set("countries", selection.partnerCodes.join(","));
  if (selection.partner) params.set("partner", selection.partner);
  if (selection.products.length > 0) params.set("products", selection.products.join(","));
  if (selection.fromYear !== minYear) params.set("from", String(selection.fromYear));
  if (selection.toYear !== maxYear) params.set("to", String(selection.toYear));

  return params;
}
