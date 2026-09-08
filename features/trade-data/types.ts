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
