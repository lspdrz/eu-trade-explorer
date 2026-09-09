"use client";

import { Radio, RadioGroup } from "@headlessui/react";
import type { TradeSource } from "../../types";

const OPTIONS: { value: TradeSource; label: string; caption: string }[] = [
  {
    value: "comext",
    label: "COMEXT",
    caption: "Validated Eurostat trade statistics, updated monthly",
  },
  {
    value: "surveillance",
    label: "Surveillance",
    caption: "Provisional customs records, updated weekly",
  },
];

/**
 * Segmented two-option data-source picker. Changing it triggers a server
 * refetch upstream (a whole new dataset), so `pending` dims the control
 * while that runs. The caption under it explains the selected source's
 * recency/authority trade-off.
 */
export function SourceToggle({
  value,
  onChange,
  pending = false,
}: {
  value: TradeSource;
  onChange: (source: TradeSource) => void;
  pending?: boolean;
}) {
  const caption = OPTIONS.find((o) => o.value === value)?.caption ?? "";

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[0.8125rem] font-medium text-muted">Source</span>
      <RadioGroup
        value={value}
        onChange={onChange}
        disabled={pending}
        aria-busy={pending}
        className="flex rounded-md border border-border bg-surface p-0.5 text-sm data-disabled:opacity-50"
      >
        {OPTIONS.map((o) => (
          <Radio
            key={o.value}
            value={o.value}
            className="cursor-pointer rounded px-3 py-1.5 data-checked:bg-border data-checked:font-medium"
          >
            {o.label}
          </Radio>
        ))}
      </RadioGroup>
      <span className="text-[0.75rem] text-muted">{caption}</span>
    </div>
  );
}
