"use client";

import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";

/**
 * Multi-select product picker for the compare-products tab. Up to `max` —
 * unselected options disable at the cap. Changing it triggers a server
 * refetch upstream, so `pending` dims the control. `topProducts` (if given)
 * form their own section pinned above the rest, in the order passed,
 * divided from it by a hairline — removed from their normal position in
 * `products` (no duplicate entry). Useful for a long `products` list where
 * the caller wants specific entries (e.g. the current selection) always
 * easy to find rather than buried alphabetically.
 */
export function ProductMultiSelect({
  products,
  topProducts = [],
  value,
  onChange,
  max,
  pending = false,
}: {
  products: string[];
  topProducts?: string[];
  value: string[];
  onChange: (v: string[]) => void;
  max: number;
  pending?: boolean;
}) {
  const atMax = value.length >= max;
  const joined = value.join(", ");
  const label =
    value.length === 0
      ? "Choose products"
      : joined.length <= 28
        ? joined
        : `${value.length} products`;

  const topSet = new Set(topProducts);
  const restProducts = products.filter((p) => !topSet.has(p));

  function renderOption(product: string) {
    const selected = value.includes(product);
    return (
      <ListboxOption
        key={product}
        value={product}
        disabled={atMax && !selected}
        className="flex cursor-pointer items-center justify-between rounded px-3 py-2 text-sm data-focus:bg-border data-disabled:opacity-40"
      >
        <span>{product}</span>
        {selected && <span aria-hidden>✓</span>}
      </ListboxOption>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[0.8125rem] font-medium text-muted">Products</span>
      <Listbox
        multiple
        value={value}
        onChange={(v: string[]) => onChange(v.slice(0, max))}
        disabled={pending}
      >
        <ListboxButton
          className="min-w-56 rounded-md border border-border bg-surface px-3 py-2 text-left text-sm data-disabled:opacity-50"
          aria-busy={pending}
        >
          {label}
        </ListboxButton>
        <ListboxOptions
          anchor="bottom start"
          className="z-20 mt-1 w-(--button-width) rounded-md border border-border bg-surface p-1 shadow-lg [--anchor-gap:4px]"
        >
          {topProducts.map(renderOption)}
          {topProducts.length > 0 && restProducts.length > 0 && (
            <hr className="my-1 border-border" />
          )}
          {restProducts.map(renderOption)}
        </ListboxOptions>
      </Listbox>
    </div>
  );
}
