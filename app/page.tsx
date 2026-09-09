import { Suspense } from "react";
import { FertilizerImports } from "@/features/trade-data/ui/components/FertilizerImports";

// `await searchParams` already opts this route into dynamic rendering; the
// explicit flag keeps the DB-backed view from ever being served from a
// build-time snapshot even if the param access moves.
export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  // Each value is string | string[] (a param can repeat); take the single value.
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  return (
    <Suspense fallback={<div className="p-6 text-muted">Loading…</div>}>
      <FertilizerImports
        source={one(params.source)}
        view={one(params.view)}
        product={one(params.product)}
        partner={one(params.partner)}
      />
    </Suspense>
  );
}
