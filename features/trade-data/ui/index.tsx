import "server-only";
import { COMEXT_PRODUCTS } from "../constants/comextProducts";
import { getAgrifoodPartners } from "../db/queries/getAgrifoodPartners";
import { getAgrifoodProducts } from "../db/queries/getAgrifoodProducts";
import { getComextPartners } from "../db/queries/getComextPartners";
import { getComextYearlyTonnesByPartner } from "../services/getComextYearlyTonnesByPartner";
import { getAgrifoodYearlyTonnesByPartner } from "../services/getAgrifoodYearlyTonnesByPartner";
import { ChartTabs } from "./components/ChartTabs";
import { FertilizerImportsCountryView } from "./components/FertilizerImportsCountryView";
import { FertilizerImportsProductsView } from "./components/FertilizerImportsProductsView";
import { SourceToggle } from "./components/SourceToggle";
import { parseSelection } from "./utils/chartSelectionParams";

type SearchParams = Record<string, string | string[] | undefined>;

function toURLSearchParams(params: SearchParams): URLSearchParams {
  const out = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") out.set(key, value);
    else if (Array.isArray(value) && value[0] !== undefined) out.set(key, value[0]);
  }
  return out;
}

/**
 * The feature's self-fetching entry point. Parses the URL once (bounds-free,
 * same parser the client uses), fetches only what the active view needs, and
 * renders the page: shared chrome (heading, source toggle, tabs) + the tab.
 *
 * - countries: each selected product's totals for every partner (client stacks
 *   the products and filters the partners)
 * - products:  every product's totals for one partner (client filters products)
 */
export async function FertilizerImports({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { source, view, products, partner } = parseSelection(
    toURLSearchParams(await searchParams),
  );

  const availableProducts =
    source === "comext" ? [...COMEXT_PRODUCTS] : await getAgrifoodProducts();
  const availablePartners =
    source === "comext" ? await getComextPartners() : await getAgrifoodPartners();

  const totalsFor = (p: string) =>
    source === "comext"
      ? getComextYearlyTonnesByPartner(p)
      : getAgrifoodYearlyTonnesByPartner(p);

  // Each fetch no-ops for the inactive view, so only the active one hits the DB.
  const selectedProducts = products.filter((p) => availableProducts.includes(p));
  const totalsByCountry =
    view === "countries" && selectedProducts.length > 0
      ? await Promise.all(
          selectedProducts.map(async (p) => ({
            product: p,
            totals: await totalsFor(p),
          })),
        )
      : [];
  const totalsByProduct =
    view === "products" && partner
      ? await Promise.all(
          availableProducts.map(async (p) => ({
            product: p,
            totals: (await totalsFor(p)).filter((t) => t.partnerCode === partner),
          })),
        )
      : [];

  const tab =
    view === "countries" ? (
      <FertilizerImportsCountryView
        availableProducts={availableProducts}
        availablePartners={availablePartners}
        totalsByCountry={totalsByCountry}
      />
    ) : (
      <FertilizerImportsProductsView
        availableProducts={availableProducts}
        availablePartners={availablePartners}
        partner={partner}
        totalsByProduct={totalsByProduct}
      />
    );

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="max-w-[34rem]">
        <h1 className="text-[1.75rem] leading-[1.15] font-semibold tracking-[-0.01em]">
          Where the EU&rsquo;s fertilizer comes from
        </h1>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">
          EU fertilizer import volumes, by partner country or by product,
          across the years on record.
        </p>
      </header>

      <div className="mt-8">
        <SourceToggle />
      </div>

      <div className="mt-6">
        <ChartTabs />
      </div>

      {tab}
    </main>
  );
}
