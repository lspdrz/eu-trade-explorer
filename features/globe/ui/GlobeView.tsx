"use client";

import { useCallback, useMemo } from "react";
import { ISO3166_NUMERIC_TO_ALPHA2 } from "@/features/globe/constants/iso3166";
import type { PartnerImportTotal } from "@/features/globe/types";
import { resolveActive, toggleCountry } from "@/features/globe/lib/resolveActive";
import { useGlobeSelection } from "@/features/globe/ui/hooks/useGlobeSelection";
import { GlobeSidePanel } from "@/features/globe/ui/GlobeSidePanel";
import { ImportFlowGlobe } from "@/features/globe/ui/ImportFlowGlobe";

/** Every alpha-2 that has a polygon in the 110m topology. */
const MAPPED_CODES = new Set(Object.values(ISO3166_NUMERIC_TO_ALPHA2));

export function GlobeView({ totals }: { totals: PartnerImportTotal[] }) {
  const { requested, setRequested } = useGlobeSelection();

  const activeCodes = useMemo(
    () => resolveActive(totals, requested),
    [totals, requested],
  );

  const onToggle = useCallback(
    (code: string) => setRequested(toggleCountry(activeCodes, code)),
    [setRequested, activeCodes],
  );
  const onReset = useCallback(() => setRequested([]), [setRequested]);

  return (
    <main className="mx-auto max-w-[90rem] px-6 pt-6 pb-20 md:pb-6">
      <header className="max-w-[34rem]">
        <h1 className="text-[1.75rem] leading-[1.15] font-semibold tracking-[-0.01em]">
          Where the EU&rsquo;s fertiliser comes from
        </h1>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">
          EU import volumes of ammonia and nitrogen fertilisers since 2010, by
          partner country. Drag the globe; add or remove origins using the
          country list.
        </p>
      </header>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_18rem] lg:items-start">
        <ImportFlowGlobe
          totals={totals}
          activeCodes={activeCodes}
          onToggle={onToggle}
        />
        <GlobeSidePanel
          totals={totals}
          activeCodes={activeCodes}
          mappedCodes={MAPPED_CODES}
          onToggle={onToggle}
          onReset={onReset}
        />
      </div>
    </main>
  );
}
