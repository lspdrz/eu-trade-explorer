import "server-only";
import { COMEXT_PRODUCTS } from "../../constants/comextProducts";
import { getSourcePartners } from "../../db/queries/getSourcePartners";
import { getSyncedProducts } from "../../db/queries/getSyncedProducts";
import { getComextYearlyTonnesByPartner } from "../../services/getComextYearlyTonnesByPartner";
import { getYearlyTonnesByPartner } from "../../services/getYearlyTonnesByPartner";
import type { ChartView, TradeSource } from "../../types";
import { DEFAULT_PRODUCT } from "../utils/chartSelectionParams";
import { FertilizerImportsView } from "./FertilizerImportsView";

/**
 * The feature's self-fetching entry point. Resolves the source and the
 * active view, then fetches only what that view needs:
 *
 * - countries: one product's totals for every partner (client filters partners)
 * - products:  every product's totals for one partner (client filters products)
 *
 * The source/view/product/partner coercion is duplicated from
 * parseChartSelection on purpose — the RSC has raw query strings, not a
 * URLSearchParams, and these one-liners aren't worth a shared helper.
 */
export async function FertilizerImports({
  source,
  view,
  product,
  partner,
}: {
  source?: string;
  view?: string;
  product?: string;
  partner?: string;
}) {
  const selectedSource: TradeSource =
    source === "surveillance" ? "surveillance" : "comext";
  const selectedView: ChartView = view === "products" ? "products" : "countries";

  const availableProducts =
    selectedSource === "comext" ? [...COMEXT_PRODUCTS] : await getSyncedProducts();
  const availablePartners = await getSourcePartners(selectedSource);

  const totalsFor = (p: string) =>
    selectedSource === "comext"
      ? getComextYearlyTonnesByPartner(p)
      : getYearlyTonnesByPartner(p);

  if (selectedView === "countries") {
    const selectedProduct =
      product && availableProducts.includes(product) ? product : DEFAULT_PRODUCT;
    const totals = await totalsFor(selectedProduct);
    return (
      <FertilizerImportsView
        source={selectedSource}
        view="countries"
        availableProducts={availableProducts}
        availablePartners={availablePartners}
        product={selectedProduct}
        totals={totals}
      />
    );
  }

  const rawPartner = partner?.trim().toUpperCase();
  const partnerCodes = new Set(availablePartners.map((p) => p.code));
  const selectedPartner =
    rawPartner && partnerCodes.has(rawPartner) ? rawPartner : "";

  const totalsByProduct = selectedPartner
    ? await Promise.all(
        availableProducts.map(async (p) => ({
          product: p,
          totals: (await totalsFor(p)).filter(
            (t) => t.partnerCode === selectedPartner,
          ),
        })),
      )
    : [];

  return (
    <FertilizerImportsView
      source={selectedSource}
      view="products"
      availableProducts={availableProducts}
      availablePartners={availablePartners}
      partner={selectedPartner}
      totalsByProduct={totalsByProduct}
    />
  );
}
