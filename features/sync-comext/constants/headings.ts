// The CN8 codes that fall under HS headings 2814 (ammonia) and 3102
// (nitrogenous fertilisers) — a CN8 code's first 4 digits ARE its HS
// heading, so "under 2814/3102" is definitional, not a judgement call.
//
// Extracted from Eurostat's product code list for this dataset, CXT_NC —
// as a plain code/description table:
//   https://ec.europa.eu/eurostat/api/comext/dissemination/sdmx/2.1/codelist/ESTAT/CXT_NC?format=TSV
// (~24 MB; `grep -E '^(2814|3102)'` trims it to these rows). The Combined
// Nomenclature with full descriptions, as a document:
//   https://www.statistik.at/fileadmin/pages/1135/WVZ_2024__CN2-_to_CN8-codes_with_description_EN.pdf
// The CN is revised annually, but codes under these two headings change
// rarely — a new one shows up as our heading totals drifting below the
// agridata portal's.
//
// Includes the "...XX" not-elsewhere-specified pseudo-codes (real trade the
// source couldn't classify to a full CN8). EXCLUDES the "...S..." codes
// (2814S522, 310240SS, 3102S562) — Eurostat confidentiality/estimation
// artifacts that overlap the real codes. Discontinued codes are kept: they
// carry real trade for the years they were active and return nothing
// otherwise.
export const COMEXT_HEADINGS = {
  // HS 2814 — ammonia (anhydrous / in aqueous solution)
  "2814": ["28141000", "28142000", "281410XX", "281420XX", "2814XXXX"],
  // HS 3102 — mineral or chemical nitrogenous fertilisers
  "3102": [
    "31021010", "31021012", "31021015", "31021019", "31021090", "31021091",
    "31021099", "310210XX", "31022100", "310221XX", "31022900", "31022910",
    "31022990", "310229XX", "31023010", "31023090", "310230XX", "31024010",
    "31024090", "310240XX", "31025000", "31025010", "31025090", "310250XX",
    "31026000", "310260XX", "31027000", "31027010", "31027090", "310270XX",
    "31028000", "310280XX", "31029000", "310290XX", "3102XXXX",
  ],
} as const;

export type ComextHeading = keyof typeof COMEXT_HEADINGS;
