import { getCountryImportTotals } from "@/features/globe/lib/getCountryImportTotals";
import { GlobeView } from "@/features/globe/ui/GlobeView";

export async function GlobeImports() {
  const totals = await getCountryImportTotals();
  return <GlobeView totals={totals} />;
}
