"use client";

import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";

/**
 * Single-select product picker. Changing it triggers a server refetch
 * upstream, so `pending` dims the control while that runs.
 */
export function ProductListbox({
  products,
  value,
  onChange,
  pending = false,
}: {
  products: string[];
  value: string;
  onChange: (product: string) => void;
  pending?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-muted">Product</label>
      <Listbox value={value} onChange={onChange} disabled={pending}>
        <ListboxButton
          className="min-w-56 rounded-md border border-border bg-surface px-3 py-2 text-left text-sm data-disabled:opacity-50"
          aria-busy={pending}
        >
          {value}
        </ListboxButton>
        <ListboxOptions
          anchor="bottom start"
          className="z-20 mt-1 w-(--button-width) rounded-md border border-border bg-surface p-1 shadow-lg [--anchor-gap:4px]"
        >
          {products.map((product) => (
            <ListboxOption
              key={product}
              value={product}
              className="cursor-pointer rounded px-3 py-2 text-sm data-focus:bg-border"
            >
              {product}
            </ListboxOption>
          ))}
        </ListboxOptions>
      </Listbox>
    </div>
  );
}
