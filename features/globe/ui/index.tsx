import { getCountryImportTotals } from "@/features/globe/lib/getCountryImportTotals";
import { GlobeView } from "@/features/globe/ui/GlobeView";

/**
 * The feature's self-fetching entry point — same shape as
 * `features/trade-data/ui/index.tsx`. Reads every partner's all-time
 * total once; the active subset is a client-side concern (`?countries=`).
 */
export async function GlobeImports() {
  const totals = await getCountryImportTotals();
  return <GlobeView totals={totals} />;
}
