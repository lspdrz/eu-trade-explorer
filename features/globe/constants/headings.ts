/**
 * The HS headings whose COMEXT rows count as "fertilizer" for the globe:
 * 2814 = ammonia, 3102 = mineral/chemical nitrogenous fertilisers. A CN8
 * code's first four digits ARE its HS heading, so the read query matches
 * by prefix (`cn8_product_code LIKE '2814%'`).
 *
 * Twin: `features/trade-data/constants/comextProducts.ts`
 * (`COMEXT_PRODUCT_HEADINGS`) hard-codes the same two. If the HS
 * classification of fertilizer ever shifts, update both — each feature
 * makes this editorial call independently (features don't import each
 * other).
 */
export const GLOBE_HS_HEADINGS = ["2814", "3102"] as const;
