"use client";

import { format } from "d3-format";
import { DEFAULT_TOP_N, MAX_GLOBE_COUNTRIES } from "@/features/globe/constants/globeConfig";
import type { PartnerImportTotal } from "@/features/globe/types";
import { topN } from "@/features/globe/utils/topN";
import { CountryPicker } from "@/features/globe/ui/CountryPicker";

/** Compact tonnes at 3 significant figures — "69.7M", "400k" (d3 emits "G", we want "B"). */
const compact = (n: number) => format(".3s")(n).replace("G", "B");

/**
 * The globe's accessible control surface. Every interaction the canvas
 * offers by mouse — which origins show, each one's value and rank, add,
 * remove — is here in the DOM and keyboard-reachable.
 */
export function GlobeSidePanel({
  totals,
  activeCodes,
  mappedCodes,
  onToggle,
  onReset,
}: {
  totals: PartnerImportTotal[];
  activeCodes: string[];
  mappedCodes: Set<string>;
  onToggle: (code: string) => void;
  onReset: () => void;
}) {
  const active = new Set(activeCodes);
  const rankByCode = new Map(totals.map((t, i) => [t.partnerCode, i + 1]));

  const rows = totals.filter((t) => active.has(t.partnerCode)); // tonnage order
  const defaultTopN = topN(totals, DEFAULT_TOP_N).map((t) => t.partnerCode);
  const isDefault =
    activeCodes.length === defaultTopN.length &&
    defaultTopN.every((c) => active.has(c));

  const addable = totals
    .filter((t) => !active.has(t.partnerCode))
    .map((t) => ({ code: t.partnerCode, name: t.partner }));

  return (
    <aside className="lg:sticky lg:top-6">
      <h2 className="text-[0.9375rem] font-semibold">
        Showing {rows.length} origin{rows.length === 1 ? "" : "s"}
      </h2>

      {totals.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No import data yet.</p>
      ) : (
        <>
          <ul className="mt-3 flex flex-col gap-1.5">
            {rows.map((t) => (
              <li
                key={t.partnerCode}
                className="flex items-baseline justify-between gap-2 text-sm"
              >
                <span className="min-w-0 truncate">
                  <span className="text-muted tabular-nums">
                    #{rankByCode.get(t.partnerCode)}
                  </span>{" "}
                  {t.partner}
                  {!mappedCodes.has(t.partnerCode) && (
                    <span className="text-muted"> (not on map)</span>
                  )}
                </span>
                <span className="flex shrink-0 items-baseline gap-2">
                  <span className="tabular-nums text-muted">
                    {compact(t.tonnes)} t
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${t.partner}`}
                    className="text-muted hover:text-foreground"
                    onClick={() => onToggle(t.partnerCode)}
                  >
                    ×
                  </button>
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4">
            <CountryPicker
              options={addable}
              onPick={onToggle}
              disabled={activeCodes.length >= MAX_GLOBE_COUNTRIES}
            />
            <p className="mt-1 text-xs text-muted">
              Compare up to {MAX_GLOBE_COUNTRIES}.
            </p>
          </div>

          {!isDefault && (
            <button
              type="button"
              className="mt-3 text-sm text-muted underline hover:text-foreground"
              onClick={onReset}
            >
              Reset to top {DEFAULT_TOP_N}
            </button>
          )}
        </>
      )}
    </aside>
  );
}
