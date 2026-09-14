/**
 * The two HS headings the app treats as "fertiliser" for COMEXT data:
 * 2814 = ammonia, 3102 = mineral/chemical nitrogenous fertilisers. A CN8
 * code's first four digits ARE its HS heading, so both features/globe and
 * features/trade-data filter by this prefix (`cn8_product_code LIKE
 * '<heading>%'`) rather than keeping a CN8 list.
 *
 * Shared here (features/constants/, per the root-level shared-folder
 * convention) rather than duplicated per feature: both features made this
 * same editorial call independently until a future classification change
 * would have had to be applied in both places by hand, with nothing
 * enforcing that it actually was.
 */
export const AMMONIA_HEADING = "2814";
export const NITROGENOUS_FERTILISER_HEADING = "3102";

export const COMEXT_FERTILISER_HEADINGS = [
  AMMONIA_HEADING,
  NITROGENOUS_FERTILISER_HEADING,
] as const;
