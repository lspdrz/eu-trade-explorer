import {
  AMMONIA_HEADING,
  NITROGENOUS_FERTILISER_HEADING,
} from "@/features/constants/comextFertiliserHeadings";
import type { ComextProduct } from "@/features/trade-data/types";

/**
 * The COMEXT source's products and the HS heading each maps to. `satisfies
 * Record<ComextProduct, string>` keeps this in lockstep with the type in
 * types.ts — adding a product to one without the other won't compile.
 *
 * A CN8 product code's first four digits ARE its HS heading (definitional),
 * so the read query filters by prefix (`cn8_product_code LIKE '<heading>%'`)
 * — there's no CN8 list to keep. The headings themselves come from
 * features/constants/comextFertiliserHeadings.ts, shared with
 * features/globe's own GLOBE_HS_HEADINGS. These are the same two groupings
 * the agridata.ec.europa.eu fertiliser dashboard uses, so totals are
 * verifiable against it.
 */
export const COMEXT_PRODUCT_HEADINGS = {
  Ammonia: AMMONIA_HEADING,
  "Nitrogenous fertilisers": NITROGENOUS_FERTILISER_HEADING,
} as const satisfies Record<ComextProduct, string>;

/** Selector options, in display order. */
export const COMEXT_PRODUCTS: ComextProduct[] = Object.keys(
  COMEXT_PRODUCT_HEADINGS,
) as ComextProduct[];
