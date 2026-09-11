/**
 * One monthly COMEXT import observation for partner=RU, parsed from the
 * SDMX-3.0 CSV feed and stored verbatim in `raw_comext_ru_imports`
 * (lib/db/schemas/rawComextRuImports.ts). No partnerCode field — every
 * observation this feature ever writes is RU, so the mutation sets it,
 * callers don't pass it.
 */
export interface ComextRuObservation {
  cn8ProductCode: string;
  /** "YYYY-MM". */
  period: string;
  quantity100kg: number | null;
  valueEuros: number | null;
}
