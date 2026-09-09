import "server-only";
import { getSyncedProducts } from "../../db/queries/getSyncedProducts";
import { getYearlyTonnesByPartner } from "../../services/getYearlyTonnesByPartner";
import { DEFAULT_PRODUCT } from "../utils/chartSelectionParams";
import { FertilizerImportsView } from "./FertilizerImportsView";

/**
 * The feature's self-fetching entry point. Reads which products exist and the
 * full aggregated dataset for the chosen one, then hands both to the client
 * view. An unknown/absent product falls back to the default here so the view
 * always gets real data.
 */
export async function FertilizerImports({ product }: { product?: string }) {
  const products = await getSyncedProducts();
  const selectedProduct =
    product && products.includes(product) ? product : DEFAULT_PRODUCT;
  const yearlyTotals = await getYearlyTonnesByPartner(selectedProduct);

  return (
    <FertilizerImportsView
      products={products}
      product={selectedProduct}
      yearlyTotals={yearlyTotals}
    />
  );
}
