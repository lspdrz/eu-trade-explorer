import "server-only";
import { COMEXT_PRODUCTS } from "@/features/trade-data/constants/comextProducts";
import { getComextPartners } from "@/features/trade-data/db/queries/getComextPartners";
import { getComextYearlyTonnesByPartner } from "@/features/trade-data/lib/getComextYearlyTonnesByPartner";
import { ChartTabs } from "@/features/trade-data/ui/components/ChartTabs";
import { EventsPanel } from "@/features/trade-data/ui/components/EventsPanel";
import { FertilizerImportsCountryView } from "@/features/trade-data/ui/components/FertilizerImportsCountryView";
import { FertilizerImportsProductsView } from "@/features/trade-data/ui/components/FertilizerImportsProductsView";
import { parseSelection } from "@/features/trade-data/lib/chartSelectionParams";

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
 * renders the page: shared chrome (heading, tabs) + the tab. COMEXT (Eurostat's
 * validated monthly statistics) is the only data source — see
 * architecture-decisions.md.
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
  const { view, products, partner } = parseSelection(
    toURLSearchParams(await searchParams),
  );

  const availableProducts: string[] = [...COMEXT_PRODUCTS];
  const availablePartners = await getComextPartners();

  // Each fetch no-ops for the inactive view, so only the active one hits the DB.
  const selectedProducts = products.filter((p) => availableProducts.includes(p));
  const totalsByCountry =
    view === "countries" && selectedProducts.length > 0
      ? await Promise.all(
          selectedProducts.map(async (p) => ({
            product: p,
            totals: await getComextYearlyTonnesByPartner(p),
          })),
        )
      : [];
  const totalsByProduct =
    view === "products" && partner
      ? await Promise.all(
          availableProducts.map(async (p) => ({
            product: p,
            totals: (await getComextYearlyTonnesByPartner(p)).filter(
              (t) => t.partnerCode === partner,
            ),
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
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="max-w-[34rem]">
        <h1 className="text-[1.75rem] leading-[1.15] font-semibold tracking-[-0.01em]">
          Where the EU&rsquo;s fertiliser comes from
        </h1>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">
          EU fertiliser import volumes, by partner country or by product,
          across the years on record.
        </p>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_17rem] lg:items-start">
        {/* min-w-0: without it the 1fr track grows to the data table's
            intrinsic width (grid items default to min-width:auto), shoving
            the events panel off-screen. With it, the table scrolls inside
            its own overflow-x-auto instead. */}
        <div className="min-w-0">
          <div className="mb-6">
            <ChartTabs />
          </div>
          {tab}
        </div>
        <EventsPanel />
      </div>
    </main>
  );
}
