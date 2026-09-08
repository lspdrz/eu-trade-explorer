import { YearlyTotalsTable } from "@/features/trade-data/ui/components/YearlyTotalsTable";

// YearlyTotalsTable reads from our own database itself — this must stay
// force-dynamic so that read is never baked into a build-time static
// snapshot and served stale to every visitor.
export const dynamic = "force-dynamic";

export default function Home() {
  return <YearlyTotalsTable />;
}
