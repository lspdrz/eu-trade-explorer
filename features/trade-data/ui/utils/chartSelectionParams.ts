import type {
  ChartSelection,
  ChartView,
  TradeSource,
  YearlyPartnerTotal,
} from "../../types";

export const MAX_COUNTRIES = 3;
export const MAX_PRODUCTS = 3;
export const DEFAULT_PRODUCT = "Ammonia";
export const DEFAULT_SOURCE: TradeSource = "comext";
export const DEFAULT_VIEW: ChartView = "countries";

const WELL_FORMED_CODE = /^[A-Z]{2}$/;

function codeList(raw: string | null, max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of (raw ?? "").split(",")) {
    const code = part.trim().toUpperCase();
    if (!code || seen.has(code) || !WELL_FORMED_CODE.test(code)) continue;
    seen.add(code);
    out.push(code);
    if (out.length === max) break;
  }
  return out;
}

function stringList(raw: string | null, max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of (raw ?? "").split(",")) {
    const v = part.trim();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
    if (out.length === max) break;
  }
  return out;
}

function year(raw: string | null): number | undefined {
  const n = Number(raw);
  return raw && Number.isFinite(n) ? Math.trunc(n) : undefined;
}

/**
 * Parse the URL into a ChartSelection. Never throws, needs no data bounds —
 * it only does structure (split, dedupe, cap, well-formed-code filter) and
 * defaults. An unknown product / partner isn't "fixed" to a valid one: it's
 * kept, and the chart simply renders nothing for it (the spec's "the absence
 * is shown, never silent"). Runs identically server-side (to pick the fetch)
 * and client-side.
 */
export function parseSelection(params: URLSearchParams): ChartSelection {
  const view: ChartView =
    params.get("view") === "products" ? "products" : "countries";
  const rawProducts = stringList(params.get("products"), MAX_PRODUCTS);
  return {
    source: params.get("source") === "surveillance" ? "surveillance" : "comext",
    view,
    partnerCodes: codeList(params.get("countries"), MAX_COUNTRIES),
    partner: (params.get("partner") ?? "").trim().toUpperCase().match(WELL_FORMED_CODE)?.[0] ?? "",
    // The countries view always shows at least one product; an empty URL means
    // "just the default". The products view starts empty (pick a partner first).
    products:
      rawProducts.length === 0 && view === "countries"
        ? [DEFAULT_PRODUCT]
        : rawProducts,
    fromYear: year(params.get("from")),
    toYear: year(params.get("to")),
  };
}

/**
 * The inverse of parseSelection. Params equal to their default are omitted,
 * so the canonical URL stays clean. `setSelection` serialises the whole
 * selection on every edit, so there's no per-param surgery to do.
 */
export function serializeSelection(selection: ChartSelection): URLSearchParams {
  const params = new URLSearchParams();

  if (selection.source !== DEFAULT_SOURCE) params.set("source", selection.source);
  if (selection.view !== DEFAULT_VIEW) params.set("view", selection.view);
  if (selection.partnerCodes.length > 0)
    params.set("countries", selection.partnerCodes.join(","));
  if (selection.partner) params.set("partner", selection.partner);
  // An empty list is never emitted; on the countries view neither is the lone
  // default product (so the canonical countries URL stays clean).
  const productsIsCountriesDefault =
    selection.view === "countries" &&
    selection.products.length === 1 &&
    selection.products[0] === DEFAULT_PRODUCT;
  if (selection.products.length > 0 && !productsIsCountriesDefault)
    params.set("products", selection.products.join(","));
  if (selection.fromYear !== undefined) params.set("from", String(selection.fromYear));
  if (selection.toYear !== undefined) params.set("to", String(selection.toYear));

  return params;
}

/**
 * The partners (name-sorted) and years (ascending) present in a fetched
 * dataset — the options the pickers offer and the slider's span.
 */
export function deriveBounds(yearlyTotals: YearlyPartnerTotal[]): {
  partners: { code: string; name: string }[];
  years: number[];
} {
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

/**
 * Resolve the selection's `fromYear` / `toYear` against the years actually in
 * the data: default to the full span, clamp to it, swap if crossed. `years`
 * must be ascending (as `deriveBounds` returns it).
 */
export function deriveYearRange(
  selection: Pick<ChartSelection, "fromYear" | "toYear">,
  years: number[],
): { fromYear: number; toYear: number } {
  if (years.length === 0) return { fromYear: 0, toYear: 0 };
  const min = years[0];
  const max = years[years.length - 1];
  const clamp = (n: number) => Math.min(Math.max(n, min), max);

  let fromYear = clamp(selection.fromYear ?? min);
  let toYear = clamp(selection.toYear ?? max);
  if (fromYear > toYear) [fromYear, toYear] = [toYear, fromYear];
  return { fromYear, toYear };
}
