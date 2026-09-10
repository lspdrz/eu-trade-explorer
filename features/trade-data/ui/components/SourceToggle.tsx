"use client";

import { Radio, RadioGroup } from "@headlessui/react";
import type { TradeSource } from "@/features/trade-data/types";
import { useChartSelection } from "@/features/trade-data/ui/hooks/useChartSelection";
import { PIVOT_CLEARED } from "@/features/trade-data/lib/chartSelectionParams";

const OPTIONS: { value: TradeSource; label: string; hint: string }[] = [
  {
    value: "comext",
    label: "COMEXT",
    hint: "Validated Eurostat trade statistics, updated monthly",
  },
  {
    value: "surveillance",
    label: "Surveillance",
    hint: "Provisional customs records, updated weekly",
  },
];

/**
 * Segmented two-option data-source picker. Self-wired to `?source=` — the
 * source is page-level, shared by both chart tabs, so it manages its own URL
 * state rather than taking it from a parent. Switching source is a pivot: it
 * clears the product / partner / year selection (the two sources don't share
 * a product or partner universe) but keeps the active tab. `isPending` dims
 * it during the refetch. Each option's recency/authority trade-off is a
 * `title` tooltip.
 */
export function SourceToggle() {
  const { selection, setSelection, isPending } = useChartSelection();

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[0.8125rem] font-medium text-muted">Source</span>
      <RadioGroup
        value={selection.source}
        onChange={(source: TradeSource) =>
          setSelection({ ...PIVOT_CLEARED, source })
        }
        disabled={isPending}
        aria-busy={isPending}
        className="flex rounded-md border border-border bg-surface p-0.5 text-sm data-disabled:opacity-50"
      >
        {OPTIONS.map((o) => (
          <Radio
            key={o.value}
            value={o.value}
            title={o.hint}
            className="cursor-pointer rounded px-3 py-1.5 data-checked:bg-border data-checked:font-medium"
          >
            {o.label}
          </Radio>
        ))}
      </RadioGroup>
    </div>
  );
}
