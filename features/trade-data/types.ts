/**
 * A weekly trade row as read back from our own database, with the
 * numeric-as-string columns converted to real numbers for arithmetic
 * (see `getAgrifoodYearlyTonnesByPartner.ts`).
 */
export interface TaxudWeekRow {
  id: number;
  sector: string;
  marketingYear: string;
  week: number;
  memberStateCode: string;
  memberStateName: string;
  partnerCode: string;
  partner: string;
  product: string;
  cn8ProductCode: string;
  taric10ProductCode: string;
  procedure: number;
  preference: number;
  euroValue: number;
  unitValue: number;
  kg: number;
  kgEquivalent: number;
  coefficient: number;
  syncedAt: Date;
}

/**
 * EU-wide yearly total for a single partner country, aggregated across all
 * reporting member states and weeks of that marketing year. This is the
 * feature's own read-model shape — see `TaxudWeekRow` above for the
 * shape it's computed from.
 */
export interface YearlyPartnerTotal {
  year: string;
  partnerCode: string;
  partner: string;
  /** Total trade weight for the year, converted from kg to tonnes. */
  tonnes: number;
}

/**
 * A single (series, year) datum — a partner country's or a product's imported
 * tonnes for one year. Used both as a flat input row to `selectGroupedSeries`
 * and as a cell in the grid it returns (where `tonnes` is 0 for a series with
 * no imports that year). A "series" is whatever the chart is comparing.
 */
export interface GroupedSeriesPoint {
  seriesKey: string;
  year: number;
  tonnes: number;
}

/**
 * The chart's full input for the current selection. `years` is every year in
 * the selected inclusive range (so the x-axis has a slot even for gap years).
 * `points` is the full seriesKey × year grid, ordered by the selected-series
 * order then by year, zero-filled.
 */
export interface GroupedSeries {
  years: number[];
  points: GroupedSeriesPoint[];
}

/**
 * A viewer-defined point-in-time marker on the year axis ("Russia invades
 * Ukraine", Feb 2022). Private to one browser — stored in localStorage, never
 * sent anywhere. `month` is 1–12.
 */
export interface ChartEvent {
  id: string;
  year: number;
  month: number;
  label: string;
}

/** The whole localStorage blob under `chart-events`. `v` guards migrations. */
export interface StoredEvents {
  v: 1;
  enabled: boolean;
  events: ChartEvent[];
}

/**
 * A single (partner, product, year) observation for the stacked countries
 * chart. The flat input to `selectStackedSeries`.
 */
export interface StackedSeriesPoint {
  partnerCode: string;
  product: string;
  year: number;
  tonnes: number;
}

/**
 * One product's slice of a country's stacked bar. `y0` / `y1` are the
 * running tonnes offsets within the stack (bottom and top of the segment).
 */
export interface StackedSegment {
  product: string;
  tonnes: number;
  y0: number;
  y1: number;
}

/**
 * One country's stacked bar in one year — a segment per selected product in
 * selection order, zero-filled. `total` is the stack height.
 */
export interface StackedCell {
  year: number;
  partnerCode: string;
  total: number;
  segments: StackedSegment[];
}

/**
 * The dense grid the stacked countries chart draws: every (year, partner)
 * cell over the selected inclusive year range, zero-filled.
 */
export interface StackedSeries {
  years: number[];
  partnerCodes: string[];
  cells: StackedCell[];
}

/**
 * The two upstream datasets the chart can read. "comext" is Eurostat's
 * validated monthly statistics (raw_comext_imports); "surveillance" is the
 * near-real-time customs feed (raw_taxud_weekly_rows). See
 * architecture-decisions.md.
 */
export type TradeSource = "comext" | "surveillance";

/** Which comparison the chart is showing. */
export type ChartView = "countries" | "products";

/**
 * The two products the COMEXT source offers (the surveillance source has its
 * own 7-way list, read from the DB). `constants/comextProducts.ts` maps each
 * to its HS heading and `satisfies` this, so the two can't drift.
 */
export type ComextProduct = "Ammonia" | "Nitrogenous fertilisers";

/**
 * The chart's full selection, exactly as the URL expresses it. `fromYear` /
 * `toYear` are what the URL asked for (`undefined` when it said nothing) —
 * clamping to the data's real span is `deriveYearRange`'s job. Owned by
 * `lib/chartSelectionParams.ts` (parse / serialize); the hook and the
 * views consume it.
 */
export interface ChartSelection {
  source: TradeSource;
  view: ChartView;
  // "Compare countries" tab
  partnerCodes: string[];
  // "Compare products" tab
  partner: string;
  // both tabs — the countries view stacks these, the products view groups them
  products: string[];
  // shared
  fromYear: number | undefined;
  toYear: number | undefined;
}

/** A selected series (partner country or product) plus its assigned colour —
 * what the legend, bars, and data table render from. */
export interface SelectedSeries {
  key: string;
  name: string;
  color: string;
}

/**
 * One COMEXT import row trimmed to what yearly aggregation needs, with the
 * numeric-as-string quantity converted to a real number (NULL → 0). Returned
 * by `getComextRowsByHeading`, consumed by `getComextYearlyTonnesByPartner`.
 */
export interface ComextYearRow {
  partnerCode: string;
  period: string; // "YYYY-MM"
  quantity100kg: number;
}
