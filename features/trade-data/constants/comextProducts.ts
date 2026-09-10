import type { ComextProduct } from "../types";

/**
 * The COMEXT source's products and the HS heading each maps to. `satisfies
 * Record<ComextProduct, string>` keeps this in lockstep with the type in
 * types.ts — adding a product to one without the other won't compile.
 *
 * A CN8 product code's first four digits ARE its HS heading (definitional),
 * so the read query filters by prefix (`cn8_product_code LIKE '<heading>%'`)
 * — there's no CN8 list to keep and nothing to import from sync-comext
 * (features don't import each other). These are the same two groupings the
 * agridata.ec.europa.eu fertiliser dashboard uses, so totals are verifiable
 * against it.
 */
export const COMEXT_PRODUCT_HEADINGS = {
  Ammonia: "2814",
  "Nitrogenous fertilisers": "3102",
} as const satisfies Record<ComextProduct, string>;

/** Selector options, in display order. */
export const COMEXT_PRODUCTS: ComextProduct[] = Object.keys(
  COMEXT_PRODUCT_HEADINGS,
) as ComextProduct[];
