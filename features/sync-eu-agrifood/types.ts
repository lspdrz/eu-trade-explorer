/**
 * A single weekly trade record as returned by the EU Agri-food Data
 * Portal's TAXUD weekly trade API — the raw record we store faithfully
 * in `raw_taxud_weekly_rows` (lib/db/schemas/rawTaxudWeeklyRows.ts).
 * 
 * The five value fields are `string`, not `number`: parsed with
 * `numberAsString: true` (lib/fetchWeeklyImports.ts) to keep exact
 * digits instead of risking precision loss through `parseFloat`.
 * `week`/`procedure`/`preference` stay `number` only because that same
 * file's reviver converts them back — safe, small integers. Converting
 * the value fields to real numbers only happens where arithmetic is
 * needed — see `features/trade-data/types.ts`'s `TaxudWeekRow`.
 */
export interface RawTaxudWeekRow {
  sector: string;
  /** Marketing year as a 4-digit string, e.g. "2023". */
  marketingYear: string;
  /** Week number within the marketing year (1-53). */
  week: number;
  /** ISO-ish 2-letter code of the reporting EU member state, e.g. "FI". */
  memberStateCode: string;
  memberStateName: string;
  /** 2-letter partner (non-EU) country code, e.g. "RU". */
  partnerCode: string;
  partner: string;
  product: string;
  /** 8-digit EU Combined Nomenclature customs code. */
  cn8ProductCode: string;
  /** 10-digit TARIC code — the most granular product identifier the API
   * provides (the last two digits encode trade-policy measures like
   * anti-dumping duties that a CN8 code alone doesn't distinguish). */
  taric10ProductCode: string;
  procedure: number;
  preference: number;
  /** Trade value in euros for this row, exact digits as the API sent them. */
  euroValue: string;
  /** Average value per kg, on a weight basis, exact digits as sent. */
  unitValue: string;
  /** Trade weight in kilograms for this row, exact digits as sent. */
  kg: string;
  /** kg normalized by `coefficient` — see that field's doc comment. */
  kgEquivalent: string;
  /** Multiplied by `kg` to compute `kgEquivalent`. 1.0 for most products;
   * differs when a product's statistical weight needs normalizing. */
  coefficient: string;
}
