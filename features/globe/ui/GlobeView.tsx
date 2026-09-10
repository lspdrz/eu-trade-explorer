"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { ISO3166_NUMERIC_TO_ALPHA2 } from "@/features/globe/constants/iso3166";
import type { PartnerImportTotal } from "@/features/globe/types";
import {
  parseGlobeCountries,
  serializeGlobeCountries,
} from "@/features/globe/lib/globeParams";
import { resolveActive, toggleCountry } from "@/features/globe/lib/resolveActive";
import { GlobeSidePanel } from "@/features/globe/ui/GlobeSidePanel";
import { ImportFlowGlobe } from "@/features/globe/ui/ImportFlowGlobe";

/** Every alpha-2 that has a polygon in the 110m topology. */
const MAPPED_CODES = new Set(Object.values(ISO3166_NUMERIC_TO_ALPHA2));

export function GlobeView({ totals }: { totals: PartnerImportTotal[] }) {
  const params = useSearchParams();
  const pathname = usePathname();

  const requested = useMemo(
    () => parseGlobeCountries(new URLSearchParams(params.toString())),
    [params],
  );
  const activeCodes = useMemo(
    () => resolveActive(totals, requested),
    [totals, requested],
  );

  const write = useCallback(
    (codes: string[]) => {
      const qs = serializeGlobeCountries(codes).toString();
      // history.replaceState integrates with Next's router (updates
      // useSearchParams) without an RSC round-trip — the same trick
      // trade-data's useChartSelection uses for in-memory edits.
      window.history.replaceState(
        null,
        "",
        qs ? `${pathname}?${qs}` : pathname,
      );
    },
    [pathname],
  );

  const onToggle = useCallback(
    (code: string) => write(toggleCountry(activeCodes, code)),
    [write, activeCodes],
  );
  const onReset = useCallback(() => write([]), [write]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="max-w-[34rem]">
        <h1 className="text-[1.75rem] leading-[1.15] font-semibold tracking-[-0.01em]">
          Where the EU&rsquo;s fertilizer comes from
        </h1>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">
          All-time EU import volumes of ammonia and nitrogen fertilisers, by
          partner country. Drag the globe; add or remove origins on the right.
        </p>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_18rem] lg:items-start">
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
