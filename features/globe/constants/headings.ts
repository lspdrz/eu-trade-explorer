import { COMEXT_FERTILISER_HEADINGS } from "@/features/constants/comextFertiliserHeadings";

/**
 * The HS headings whose COMEXT rows count as "fertilizer" for the globe. A
 * CN8 code's first four digits ARE its HS heading, so the read query
 * matches by prefix (`cn8_product_code LIKE '2814%'`).
 *
 * Sourced from features/constants/comextFertiliserHeadings.ts, the same
 * list features/trade-data/constants/comextProducts.ts's
 * COMEXT_PRODUCT_HEADINGS derives from — one editorial call, not two.
 */
export const GLOBE_HS_HEADINGS = COMEXT_FERTILISER_HEADINGS;
