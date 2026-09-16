import { Suspense } from "react";
import { FertilizerImports } from "@/features/trade-data/ui";

export default function Home() {
  return (
    <Suspense fallback={<div className="p-6 text-muted">Loading…</div>}>
      <FertilizerImports />
    </Suspense>
  );
}
