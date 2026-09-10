import { Suspense } from "react";
import { FertilizerImports } from "@/features/trade-data/ui";

// A `searchParams` access opts the route into dynamic rendering; the explicit
// flag keeps the DB-backed view from ever being served from a build-time
// snapshot. The promise is passed straight through and awaited inside the
// Suspense boundary (Next's "push dynamic access down").
export const dynamic = "force-dynamic";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<div className="p-6 text-muted">Loading…</div>}>
      <FertilizerImports searchParams={searchParams} />
    </Suspense>
  );
}
