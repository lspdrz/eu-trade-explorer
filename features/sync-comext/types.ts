/**
 * One monthly COMEXT import observation, parsed from the SDMX-3.0 CSV feed
 * and stored verbatim in `raw_comext_imports` (lib/db/schemas/rawComextImports.ts).
 * Fields map 1:1 to the table columns (minus id / synced_at).
 *
 * `quantity100kg` is COMEXT's unit — hundredweight, not kg. Both measures
 * are nullable: a (cn8, partner, period) cell may carry only one indicator.
 * The feed is partner-code-only — no name.
 */
export interface ComextObservation {
  cn8ProductCode: string;
  partnerCode: string;
  /** "YYYY-MM". */
  period: string;
  quantity100kg: number | null;
  valueEuros: number | null;
}
