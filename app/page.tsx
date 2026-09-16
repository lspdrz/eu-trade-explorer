import { Suspense } from "react";
import { FertilizerImports } from "@/features/trade-data/ui";

// FertilizerImports no longer reads searchParams itself (it fetches
// everything unconditionally and lets client components pick what to show),
// but this flag stays on for now — removing it is a separate, later change.
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <Suspense fallback={<div className="p-6 text-muted">Loading…</div>}>
      <FertilizerImports />
    </Suspense>
  );
}
