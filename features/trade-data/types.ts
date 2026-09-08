/**
 * A weekly trade row as read back from our own database, with the
 * numeric-as-string columns converted to real numbers for arithmetic
 * (see `aggregateYearlyTonnesByPartner.ts`).
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
 * One bar in the grouped chart: a single partner country's imported tonnes
 * for a single year. `tonnes` is 0 when that country had no imports that year.
 */
export interface GroupedSeriesPoint {
  partnerCode: string;
  year: number;
  tonnes: number;
}

/**
 * The chart's full input for the current selection. `years` is every year in
 * the selected inclusive range (so the x-axis has a slot even for gap years).
 * `points` is the full partnerCode × year grid, ordered by the
 * selected-country order then by year, zero-filled.
 */
export interface GroupedSeries {
  years: number[];
  points: GroupedSeriesPoint[];
}
