import type {
  ChartSelection,
  ChartView,
  YearlyPartnerTotal,
} from "@/features/trade-data/types";

export const MAX_COUNTRIES = 2;
export const MAX_PRODUCTS = 3;
export const DEFAULT_VIEW: ChartView = "countries";

/** On mobile, the widest year range that still leaves room for a per-bar
 *  country-code label under every bar of a year-group without them
 *  colliding — see StackedImportsChart's docstring. Passed to
 *  deriveYearRange and YearRangeSlider's maxSpan only when useIsMobile(). */
export const MAX_YEAR_SPAN_MOBILE = 7;

/**
 * Viewport width, in px, below which the sidebar either hasn't appeared
 * yet (phones) or has just claimed space from the chart column — both
 * need MAX_YEAR_SPAN_MOBILE's leaner per-bar label spacing. Matches the
 * breakpoint the sidebar's own two-column layout switches on.
 */
export const NARROW_CHART_BREAKPOINT = 1024;

/** Fresh-visit defaults, shared by both tabs — Ammonia is the headline
 *  product, Russia the headline partner. Only apply when the URL says
 *  nothing at all about a field (see parseSelection's `params.has` checks);
 *  a visitor who explicitly clears a picker down to nothing still sees
 *  nothing, not a bounce back to these. */
export const DEFAULT_PRODUCTS = ["Ammonia"];
export const DEFAULT_PARTNER_CODES = ["RU"];
export const DEFAULT_PARTNER = "RU";

/**
 * The selection fields a "pivot" (a tab switch) wipes, back to the same
 * fresh-visit defaults above rather than empty — switching tabs is a new
 * start, not a dead end. `view` itself is set by the caller alongside this.
 */
export const PIVOT_CLEARED = {
  products: DEFAULT_PRODUCTS,
  partnerCodes: DEFAULT_PARTNER_CODES,
  partner: DEFAULT_PARTNER,
  fromYear: undefined,
  toYear: undefined,
} satisfies Partial<ChartSelection>;

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
 * it only does structure (split, dedupe, cap, well-formed-code filter).
 * `view` and an absent product/partner/countries default (see
 * DEFAULT_PRODUCTS etc. above); anything actually present in the URL — even
 * an explicitly empty value, e.g. `?products=` — is parsed as-is and never
 * "fixed" to a valid or default one (the spec's "the absence is shown,
 * never silent" still holds once a visitor has touched a field). Runs
 * identically server-side (to pick the fetch) and client-side.
 */
export function parseSelection(params: URLSearchParams): ChartSelection {
  return {
    view: params.get("view") === "products" ? "products" : "countries",
    partnerCodes: params.has("countries")
      ? codeList(params.get("countries"), MAX_COUNTRIES)
      : DEFAULT_PARTNER_CODES,
    partner: params.has("partner")
      ? ((params.get("partner") ?? "").trim().toUpperCase().match(WELL_FORMED_CODE)?.[0] ?? "")
      : DEFAULT_PARTNER,
    products: params.has("products")
      ? stringList(params.get("products"), MAX_PRODUCTS)
      : DEFAULT_PRODUCTS,
    fromYear: year(params.get("from")),
    toYear: year(params.get("to")),
  };
}

/**
 * The inverse of parseSelection. Params equal to their default are omitted,
 * so the canonical URL stays clean. `setSelection` serialises the whole
 * selection on every edit, so there's no per-param surgery to do. A field
 * explicitly cleared to empty (differs from its default) still round-trips:
 * it's serialised as an explicit empty value rather than omitted, so
 * parseSelection's `params.has` check reads it back as "present" rather
 * than falling through to the default.
 */
export function serializeSelection(selection: ChartSelection): URLSearchParams {
  const params = new URLSearchParams();

  if (selection.view !== DEFAULT_VIEW) params.set("view", selection.view);
  if (selection.partnerCodes.join(",") !== DEFAULT_PARTNER_CODES.join(","))
    params.set("countries", selection.partnerCodes.join(","));
  if (selection.partner !== DEFAULT_PARTNER) params.set("partner", selection.partner);
  if (selection.products.join(",") !== DEFAULT_PRODUCTS.join(","))
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
 *
 * `maxSpan`, when given, caps the resolved span (inclusive) to at most that
 * many years — trimmed from the start, keeping `toYear` (the more recent,
 * and the one actually requested when only `fromYear` was left to default)
 * intact. Used on mobile, where a per-bar label under every bar only has
 * room to coexist with its neighbors across a handful of years at once.
 */
export function deriveYearRange(
  selection: Pick<ChartSelection, "fromYear" | "toYear">,
  years: number[],
  maxSpan?: number,
): { fromYear: number; toYear: number } {
  if (years.length === 0) return { fromYear: 0, toYear: 0 };
  const min = years[0];
  const max = years[years.length - 1];
  const clamp = (n: number) => Math.min(Math.max(n, min), max);

  let fromYear = clamp(selection.fromYear ?? min);
  let toYear = clamp(selection.toYear ?? max);
  if (fromYear > toYear) [fromYear, toYear] = [toYear, fromYear];
  if (maxSpan !== undefined && toYear - fromYear > maxSpan) {
    fromYear = toYear - maxSpan;
  }
  return { fromYear, toYear };
}
