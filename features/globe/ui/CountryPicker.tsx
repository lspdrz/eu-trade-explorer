"use client";

import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import { useState } from "react";

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/**
 * Add-a-country typeahead. A slim single-select cousin of trade-data's
 * CountryCombobox — not shared, because features don't import each other
 * and this needs only a fraction of that component.
 */
export function CountryPicker({
  options,
  onPick,
  disabled = false,
}: {
  options: { code: string; name: string }[];
  onPick: (code: string) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const q = normalize(query);
  const matches = (
    q
      ? options.filter(
          (o) => normalize(o.name).includes(q) || normalize(o.code).includes(q),
        )
      : options
  ).slice(0, 50);

  return (
    <Combobox
      immediate
      value={null}
      onChange={(code: string | null) => {
        if (code) onPick(code);
        setQuery("");
      }}
      onClose={() => setQuery("")}
      disabled={disabled}
    >
      <ComboboxInput
        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm disabled:opacity-40"
        placeholder={disabled ? "Remove one to add another" : "Add a country…"}
        onChange={(e) => setQuery(e.target.value)}
        displayValue={() => ""}
      />
      <ComboboxOptions
        anchor="bottom start"
        className="z-20 mt-1 max-h-64 w-64 overflow-auto rounded-md border border-border bg-surface p-1 shadow-lg [--anchor-gap:4px] empty:invisible"
      >
        {matches.map((o) => (
          <ComboboxOption
            key={o.code}
            value={o.code}
            className="cursor-pointer rounded px-3 py-2 text-sm data-focus:bg-border"
          >
            {o.name}
          </ComboboxOption>
        ))}
      </ComboboxOptions>
    </Combobox>
  );
}
