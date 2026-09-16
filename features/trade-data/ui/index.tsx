import "server-only";
import { COMEXT_PRODUCTS } from "@/features/trade-data/constants/comextProducts";
import { getComextPartners } from "@/features/trade-data/db/queries/getComextPartners";
import { getComextYearlyTonnesByPartner } from "@/features/trade-data/lib/getComextYearlyTonnesByPartner";
import { ChartTabs } from "@/features/trade-data/ui/components/ChartTabs";
import { EventsPanel } from "@/features/trade-data/ui/components/EventsPanel";
import { FertilizerImportsChart } from "@/features/trade-data/ui/components/FertilizerImportsChart";
import { FertilizerImportsControls } from "@/features/trade-data/ui/components/FertilizerImportsControls";

/**
 * The feature's entry point. Statically rendered at `next build` time —
 * every product's totals for every partner (~146 KB total, measured
 * against the full dataset) are fetched once here, unconditionally, and
 * handed to two client components (FertilizerImportsChart/Controls) that
 * pick what to show from the URL (?view=, ?products=, ?partner=,
 * ?countries=, ...) entirely in the browser via useChartSelection. The
 * RSC never reads `searchParams` — doing so, for any reason, would opt
 * this page back into per-request dynamic rendering. COMEXT (Eurostat's
 * validated monthly statistics) is the only data source — see
 * architecture-decisions.md.
 */
export async function FertilizerImports() {
  const availableProducts: string[] = [...COMEXT_PRODUCTS];
  const [availablePartners, allTotals] = await Promise.all([
    getComextPartners(),
    Promise.all(
      availableProducts.map(async (product) => ({
        product,
        totals: await getComextYearlyTonnesByPartner(product),
      })),
    ),
  ]);

  return (
    <main className="mx-auto max-w-[90rem] px-6 pt-6 pb-20 md:pb-6">
      {/* header lives inside the main column (not spanning full width above
          the grid) so its top edge lines up with the sidebar's first item —
          both start at the grid's own top, per items-start below. */}
      {/* md:, not lg: — the sidebar (tabs, controls, events) sits beside
          the chart from tablet width up, not just laptop-or-wider, so it
          never has to steal a whole row's height from the chart column. */}
      <div className="grid gap-8 md:grid-cols-[1fr_17rem] md:items-start">
        {/* min-w-0: without it the 1fr track grows to the data table's
            intrinsic width (grid items default to min-width:auto), shoving
            the sidebar off-screen. With it, the table scrolls inside its
            own overflow-x-auto instead. */}
        <div className="min-w-0">
          <header className="max-w-[34rem]">
            <h1 className="text-[1.75rem] leading-[1.15] font-semibold tracking-[-0.01em]">
              Where the EU&rsquo;s fertiliser comes from
            </h1>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">
              EU fertiliser import volumes, by partner country or by product,
              across the years on record.
            </p>
          </header>
          <div className="mt-6">
            <FertilizerImportsChart
              availablePartners={availablePartners}
              allTotals={allTotals}
            />
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <ChartTabs />
          <FertilizerImportsControls
            availableProducts={availableProducts}
            availablePartners={availablePartners}
            allTotals={allTotals}
          />
          <EventsPanel />
        </div>
      </div>
    </main>
  );
}
