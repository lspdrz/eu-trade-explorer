"use client";

import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import { useState } from "react";
import { MAX_COUNTRIES } from "../utils/chartSelectionParams";
import { filterCountries } from "../utils/filterCountries";

export function CountryCombobox({
  partners,
  value,
  onChange,
}: {
  partners: { code: string; name: string }[];
  value: string[];
  onChange: (codes: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const atMax = value.length >= MAX_COUNTRIES;
  const nameByCode = new Map(partners.map((p) => [p.code, p.name]));
  const matches = filterCountries(partners, query).slice(0, 50);

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-muted">
        Countries ({value.length}/{MAX_COUNTRIES})
      </label>

      {value.length > 0 && (
        <ul className="flex flex-wrap items-center gap-1.5">
          {value.map((code) => (
            <li
              key={code}
              className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs"
            >
              {nameByCode.get(code) ?? code}
              <button
                type="button"
                aria-label={`Remove ${nameByCode.get(code) ?? code}`}
                className="text-muted hover:text-foreground"
                onClick={() => onChange(value.filter((c) => c !== code))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <Combobox
        multiple
        immediate
        value={value}
        onChange={(codes: string[]) => {
          onChange(codes.slice(0, MAX_COUNTRIES));
          setQuery("");
        }}
        onClose={() => setQuery("")}
      >
        <ComboboxInput
          className="min-w-56 rounded-md border border-border bg-surface px-3 py-2 text-sm"
          placeholder={atMax ? "Remove one to add another" : "Search countries…"}
          onChange={(e) => setQuery(e.target.value)}
          displayValue={() => ""}
        />
        <ComboboxOptions
          anchor="bottom start"
          className="z-20 mt-1 max-h-64 w-72 overflow-auto rounded-md border border-border bg-surface p-1 shadow-lg [--anchor-gap:4px] empty:invisible"
        >
          {matches.map((partner) => {
            const selected = value.includes(partner.code);
            return (
              <ComboboxOption
                key={partner.code}
                value={partner.code}
                disabled={atMax && !selected}
                className="flex cursor-pointer items-center justify-between rounded px-3 py-2 text-sm data-focus:bg-border data-disabled:opacity-40"
              >
                <span>{partner.name}</span>
                {selected && <span aria-hidden>✓</span>}
              </ComboboxOption>
            );
          })}
        </ComboboxOptions>
      </Combobox>
    </div>
  );
}
