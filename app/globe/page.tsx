import { Suspense } from "react";
import { GlobeImports } from "@/features/globe/ui";

// DB-backed; never serve from a build-time snapshot. `GlobeView` reads
// `?countries=` via `useSearchParams`, so it needs a Suspense boundary
// (same shape as `app/page.tsx`).
export const dynamic = "force-dynamic";

export default function GlobePage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted">Loading…</div>}>
      <GlobeImports />
    </Suspense>
  );
}
