import "server-only";
import { COMEXT_PRODUCTS } from "../../constants/comextProducts";
import { getSyncedProducts } from "../../db/queries/getSyncedProducts";
import { getComextYearlyTonnesByPartner } from "../../services/getComextYearlyTonnesByPartner";
import { getYearlyTonnesByPartner } from "../../services/getYearlyTonnesByPartner";
import type { TradeSource } from "../../types";
import { DEFAULT_PRODUCT } from "../utils/chartSelectionParams";
import { FertilizerImportsView } from "./FertilizerImportsView";

/**
 * The feature's self-fetching entry point. Reads which products exist and the
 * full aggregated dataset for the chosen source + product, then hands both to
 * the client view. Unknown source/product values fall back here so the view
 * always gets real data.
 *
 * `source === "surveillance" ? … : "comext"` is duplicated from
 * parseChartSelection on purpose — the RSC has the raw query string, not a
 * URLSearchParams, and the two-value coercion isn't worth a shared helper.
 */
export async function FertilizerImports({
  source,
  product,
}: {
  source?: string;
  product?: string;
}) {
  const selectedSource: TradeSource =
    source === "surveillance" ? "surveillance" : "comext";

  const products =
    selectedSource === "comext" ? [...COMEXT_PRODUCTS] : await getSyncedProducts();
  const selectedProduct =
    product && products.includes(product) ? product : DEFAULT_PRODUCT;
  const yearlyTotals =
    selectedSource === "comext"
      ? await getComextYearlyTonnesByPartner(selectedProduct)
      : await getYearlyTonnesByPartner(selectedProduct);

  return (
    <FertilizerImportsView
      source={selectedSource}
      products={products}
      product={selectedProduct}
      yearlyTotals={yearlyTotals}
    />
  );
}
