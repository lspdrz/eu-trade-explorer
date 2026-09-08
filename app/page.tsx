import { Suspense } from "react";
import { FertilizerImports } from "@/features/trade-data/ui/components/FertilizerImports";

// `await searchParams` already opts this route into dynamic rendering; the
// explicit flag keeps the DB-backed view from ever being served from a
// build-time snapshot even if the param access moves.
export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const productParam = Array.isArray(params.product)
    ? params.product[0]
    : params.product;

  return (
    <Suspense fallback={<div className="p-6 text-muted">Loading…</div>}>
      <FertilizerImports product={productParam} />
    </Suspense>
  );
}
