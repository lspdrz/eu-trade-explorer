# Static Fertilizer Imports Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/` (the fertilizer-imports page, `features/trade-data`) build-time static instead of per-request dynamic, without changing how selection/filtering behaves or looks to a visitor.

**Architecture:** The page is dynamic today only because its RSC (`FertilizerImports` in `features/trade-data/ui/index.tsx`) reads `searchParams` twice: once to decide *what to fetch* (which product, which partner, which view), and once to decide *which JSX branch to render* (`chartView`/`controlsView`). Since the full dataset (both products, every partner, every year) is only ~146 KB, the fix is to always fetch everything unconditionally and move both of those `searchParams`-driven decisions into small client components that already have a working, URL-synced mechanism for this (`useChartSelection`). Two currently-server-side-filtered pieces of logic (the products view's partner filter, `ProductsViewControls`'s partner readout) move to read the same value from `useChartSelection()` client-side instead of a server-computed prop. Three `setSelection` call sites that currently force a server re-fetch (`reRunServer: true`, the default) no longer need to, since the data they'd be "waiting for" is already loaded.

**Tech Stack:** Next.js 16 App Router (Turbopack), React Server + Client Components, Drizzle/Postgres, Vitest.

**Spec:** No standalone spec file — this plan implements the conclusion reached through direct investigation and measurement in the session that produced it (see this plan's own findings, restated in the Architecture section above and in each task's rationale). If a reviewer wants the full reasoning trail (measured data sizes, why `force-dynamic` can't just be deleted, why `searchParams` access alone forces dynamic rendering), it's in that conversation; this plan restates every fact it depends on inline so it stands alone.

## Global Constraints

- Every import uses the `@/...` alias — no relative paths (eslint-enforced, autofixable).
- A file in `features/<f>` may import its own feature, `@/lib`, and shared root folders — never another feature directly.
- Commit subjects must start with an approved verb: **Add, Remove, Fix, Bump, Make, Start, Stop, Refactor, Reformat, Optimize, Document** (enforced by `.githooks/commit-msg` and CI).
- Vitest: `unit` project (no DB) for everything in this plan — none of these tests touch Postgres.
- `npx tsc --noEmit`, `npx eslint <files>`, and `npm test` must stay clean after every task.
- No relative imports, no new `useEffect`+`useState` patterns where the existing hooks already cover it — this plan reuses `useChartSelection` exactly as it exists today; it does not modify that hook.

---

## File Structure

| File | Responsibility |
|---|---|
| `features/trade-data/ui/components/FertilizerImportsProductsView.tsx` | **Modify.** Filter `totalsByProduct` to the selected partner itself, from `useChartSelection()`, instead of trusting the caller to have already scoped it. Drop the `partner` prop. |
| `features/trade-data/ui/components/ProductsViewControls.tsx` | **Modify.** Read the current partner from `useChartSelection()` instead of a `partner` prop. Drop the `partner` prop. Mark the partner-change `setSelection` call `reRunServer: false`. |
| `features/trade-data/ui/components/CountryViewControls.tsx` | **Modify.** Mark the products-change `setSelection` call `reRunServer: false`. |
| `features/trade-data/ui/components/ChartTabs.tsx` | **Modify.** Mark the view-change `setSelection` call `reRunServer: false`. |
| `features/trade-data/ui/index.tsx` | **Modify.** Stop reading `searchParams` entirely. Always fetch both products' full totals and the partner list, unconditionally. Delegate the view-conditional rendering to two new client components instead of branching on `view` itself. |
| `features/trade-data/ui/components/FertilizerImportsChart.tsx` | **Create.** Client component: picks `FertilizerImportsCountryView` vs `FertilizerImportsProductsView` from `useChartSelection().selection.view`. |
| `features/trade-data/ui/components/FertilizerImportsControls.tsx` | **Create.** Client component: same split as above, for `CountryViewControls` vs `ProductsViewControls`. |
| `app/page.tsx` | **Modify.** Drop `export const dynamic = "force-dynamic"` and the `searchParams` prop — nothing in the render path needs either anymore. |

No other files change. `useChartSelection.ts`, `chartSelectionParams.ts`, `getComextPartners.ts`, `getComextYearlyTonnesByPartner.ts`, and every chart/table/picker component below `*View`/`*Controls` are untouched — this plan only moves *which data reaches* those files and *who decides which branch to render*, not what any of them compute.

Tasks are ordered so every one lands the app in a fully working, correct state — no task depends on a later task to not be actively wrong in the meantime.

---

### Task 1: Make `FertilizerImportsProductsView` filter by the selected partner itself

**Why first:** Today, `ui/index.tsx` pre-filters `totalsByProduct` to one partner server-side before this component ever sees it (`.filter((t) => t.partnerCode === partner)` in `ui/index.tsx`). Task 5 removes that server-side filter, at which point this component would start silently summing every partner's tonnage together into each product's bar — a real, silent correctness bug — unless this component already does its own filtering by then. Doing it now, before anything else changes, is safe either way: filtering an array that's already scoped to exactly one partner by that exact same partner code is a no-op, so this task changes no observable behavior yet.

**Files:**
- Modify: `features/trade-data/ui/components/FertilizerImportsProductsView.tsx`
- Test: `features/trade-data/ui/components/__tests__/FertilizerImportsProductsView.test.tsx`

**Interfaces:**
- Consumes: `useChartSelection()` → `{ selection: { partner: string, ... } }` (already imported and called in this file today, just not read for this purpose yet).
- Produces: `FertilizerImportsProductsView` no longer accepts a `partner` prop. Its remaining props (`availablePartners`, `totalsByProduct`) are unchanged in shape.

- [ ] **Step 1: Write the failing test**

Add this test to `features/trade-data/ui/components/__tests__/FertilizerImportsProductsView.test.tsx`, inside the existing `describe("FertilizerImportsProductsView", ...)` block:

```tsx
  it("filters totalsByProduct to the selected partner itself, not relying on the caller to have already scoped it", () => {
    selection = { ...selection, partner: "EG", products: ["Ammonia"] };
    const html = renderToStaticMarkup(
      <FertilizerImportsProductsView
        availablePartners={props.availablePartners}
        totalsByProduct={[
          {
            product: "Ammonia",
            totals: [
              { year: "2021", partnerCode: "EG", partner: "Egypt", tonnes: 100 },
              { year: "2021", partnerCode: "MA", partner: "Morocco", tonnes: 900 },
            ],
          },
        ]}
      />,
    );
    // Correct (EG-only): "100". Buggy (summed across both partners): "1,000".
    expect(html).toContain("100");
    expect(html).not.toContain("1,000");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run features/trade-data/ui/components/__tests__/FertilizerImportsProductsView.test.tsx`
Expected: FAIL — the component still uses the `partner` prop (not passed in this new test call, so it's `undefined`), and `totalsByProduct` isn't filtered, so the rendered total sums to 1000 ("1,000" appears, contradicting `not.toContain`).

- [ ] **Step 3: Implement the fix**

In `features/trade-data/ui/components/FertilizerImportsProductsView.tsx`, remove `partner` from the destructured props and its type, and filter `totalsByProduct` by `selection.partner` before building `rows`:

```tsx
"use client";

import type { YearlyPartnerTotal } from "@/features/trade-data/types";
import {
  MAX_PRODUCTS,
  deriveBounds,
  deriveYearRange,
} from "@/features/trade-data/lib/chartSelectionParams";
import { useChartSelection } from "@/features/trade-data/ui/hooks/useChartSelection";
import { ImportsChartPanel } from "@/features/trade-data/ui/components/ImportsChartPanel";

/**
 * "Compare products" tab's chart: one partner country, up to three
 * products, a bar per product. Renders the partner's chart only — the
 * controls row lives in the sidebar (ProductsViewControls) and the
 * shared chrome is the RSC's.
 *
 * Filters `totalsByProduct` to `selection.partner` itself rather than
 * trusting the caller to have already scoped it to one partner — the RSC
 * fetches every partner's totals for every product unconditionally now
 * (see ui/index.tsx), so this is the only place left that knows which
 * partner is actually selected.
 */
export function FertilizerImportsProductsView({
  availablePartners,
  totalsByProduct,
}: {
  availablePartners: { code: string; name: string }[];
  totalsByProduct: { product: string; totals: YearlyPartnerTotal[] }[];
}) {
  const { selection } = useChartSelection();
  const partner = selection.partner;

  const scoped = totalsByProduct.map(({ product, totals }) => ({
    product,
    totals: totals.filter((t) => t.partnerCode === partner),
  }));

  const allTotals = scoped.flatMap((t) => t.totals);
  const { years } = deriveBounds(allTotals);
  const { fromYear, toYear } = deriveYearRange(selection, years);
  const partialYear = years.length ? years[years.length - 1] : undefined;

  const rows = scoped.flatMap(({ product, totals }) =>
    totals.map((t) => ({
      seriesKey: product,
      year: Number(t.year),
      tonnes: t.tonnes,
    })),
  );

  const partnerName =
    availablePartners.find((p) => p.code === partner)?.name ?? partner;

  return (
    <ImportsChartPanel
      rows={rows}
      seriesKeys={selection.products}
      nameFor={(key) => key}
      seriesLabel="Product"
      colorMax={MAX_PRODUCTS}
      ariaLabel={(names) =>
        partner
          ? `${partnerName}'s EU imports in tonnes per year for ${names}`
          : `EU imports in tonnes per year for ${names}`
      }
      emptyMessage={
        partner
          ? "Choose one or more products to compare."
          : "Choose a partner country to compare products."
      }
      fromYear={fromYear}
      toYear={toYear}
      partialYear={partialYear}
    />
  );
}
```

- [ ] **Step 4: Update the existing tests to drop the now-removed `partner` prop**

In `features/trade-data/ui/components/__tests__/FertilizerImportsProductsView.test.tsx`, remove the `partner: "EG"` line from the `props` object, and remove the `partner=""` override in the empty-state test (the mock's `selection.partner = ""` already drives that case):

```tsx
const props = {
  availablePartners: [
    { code: "EG", name: "Egypt" },
    { code: "MA", name: "Morocco" },
  ],
  totalsByProduct: [
    {
      product: "Ammonia",
      totals: [
        { year: "2021", partnerCode: "EG", partner: "Egypt", tonnes: 100 },
      ],
    },
  ],
};
```

```tsx
  it("shows the products empty state when no partner or product is selected", () => {
    selection = { ...selection, partner: "", products: [] };
    const html = renderToStaticMarkup(<FertilizerImportsProductsView {...props} />);
    expect(html).toContain("Choose a partner country to compare products");
    expect(html).not.toContain("chart-bar");
  });
```

- [ ] **Step 5: Run the full test file to verify everything passes**

Run: `npx vitest run features/trade-data/ui/components/__tests__/FertilizerImportsProductsView.test.tsx`
Expected: PASS (3 tests: the two existing ones plus the new filtering test).

- [ ] **Step 6: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint features/trade-data/ui/components/FertilizerImportsProductsView.tsx features/trade-data/ui/components/__tests__/FertilizerImportsProductsView.test.tsx`
Expected: both clean. (`tsc` will also flag `ui/index.tsx` still passing a `partner` prop this component no longer accepts — that's expected and gets fixed in Task 5; ignore that one error for now, or fix Task 5 in the same pass if working ahead — Step 7 below re-checks this at the end.)

- [ ] **Step 7: Commit**

```bash
git add features/trade-data/ui/components/FertilizerImportsProductsView.tsx features/trade-data/ui/components/__tests__/FertilizerImportsProductsView.test.tsx
git commit -m "Make FertilizerImportsProductsView filter by its own selected partner"
```

---

### Task 2: Make `ProductsViewControls` read the partner from `useChartSelection` instead of a prop

**Why:** Same reasoning as Task 1 — once the RSC stops computing a per-partner-scoped prop (Task 5), a server-passed `partner` prop would be frozen at build time and never reflect a later client-side selection change. `selection.partner` (already available via `useChartSelection()`, already called in this file) is the live, URL-synced source of truth. Safe to do now: `selection.partner` and the `partner` prop carry the exact same value today (both derived from the same request's `?partner=` parsing), so this is a no-op behavior change until Task 5 lands.

**Files:**
- Modify: `features/trade-data/ui/components/ProductsViewControls.tsx`
- Test: `features/trade-data/ui/components/__tests__/ProductsViewControls.test.tsx`

**Interfaces:**
- Consumes: `useChartSelection()` → `{ selection: { partner: string, ... } }` (already imported/called in this file).
- Produces: `ProductsViewControls` no longer accepts a `partner` prop. Its remaining props (`availableProducts`, `availablePartners`, `totalsByProduct`) are unchanged in shape.

- [ ] **Step 1: Update the test fixture (no new test needed — behavior is unchanged, just the input source)**

In `features/trade-data/ui/components/__tests__/ProductsViewControls.test.tsx`, remove `partner: "EG"` from `props` (the mock's `selection.partner = "EG"` already provides the same value):

```tsx
const props = {
  availableProducts: ["Ammonia", "Nitrogenous fertilisers"],
  availablePartners: [
    { code: "EG", name: "Egypt" },
    { code: "MA", name: "Morocco" },
  ],
  totalsByProduct: [
    {
      product: "Ammonia",
      totals: [
        { year: "2020", partnerCode: "EG", partner: "Egypt", tonnes: 90 },
        { year: "2021", partnerCode: "EG", partner: "Egypt", tonnes: 100 },
      ],
    },
  ],
};
```

- [ ] **Step 2: Run the existing tests to confirm they still pass unchanged (sanity check before touching the component)**

Run: `npx vitest run features/trade-data/ui/components/__tests__/ProductsViewControls.test.tsx`
Expected: FAIL — TypeScript/the component still requires a `partner` prop that `props` no longer has. (This is the "red" step; the fixture change is step 1 of TDD here since the component is what needs to change, not new behavior to assert.)

- [ ] **Step 3: Implement the change**

In `features/trade-data/ui/components/ProductsViewControls.tsx`, drop `partner` from props and read it from `selection` instead:

```tsx
"use client";

import type { YearlyPartnerTotal } from "@/features/trade-data/types";
import {
  MAX_PRODUCTS,
  deriveBounds,
  deriveYearRange,
} from "@/features/trade-data/lib/chartSelectionParams";
import { useChartSelection } from "@/features/trade-data/ui/hooks/useChartSelection";
import { CountryCombobox } from "@/features/trade-data/ui/components/CountryCombobox";
import { ProductMultiSelect } from "@/features/components/ProductMultiSelect";
import { YearRangeSlider } from "@/features/trade-data/ui/components/YearRangeSlider";

/**
 * "Compare products" tab's controls — single partner picker, product
 * picker, year-range slider. Lives in the page's sidebar column, above
 * EventsPanel; reads/writes the URL selection itself (useChartSelection).
 */
export function ProductsViewControls({
  availableProducts,
  availablePartners,
  totalsByProduct,
}: {
  availableProducts: string[];
  availablePartners: { code: string; name: string }[];
  totalsByProduct: { product: string; totals: YearlyPartnerTotal[] }[];
}) {
  const { selection, setSelection, isPending } = useChartSelection();

  const allTotals = totalsByProduct.flatMap((t) => t.totals);
  const { years } = deriveBounds(allTotals);
  const { fromYear, toYear } = deriveYearRange(selection, years);

  return (
    <div className="flex flex-col gap-4 border-b border-border pb-6">
      <CountryCombobox
        partners={availablePartners}
        value={selection.partner ? [selection.partner] : []}
        onChange={(codes) =>
          setSelection({ partner: codes[0] ?? "" }, { reRunServer: false })
        }
        max={1}
        label="Partner"
      />
      <ProductMultiSelect
        products={availableProducts}
        value={selection.products}
        onChange={(products) => setSelection({ products }, { reRunServer: false })}
        max={MAX_PRODUCTS}
        pending={isPending}
      />
      {years.length > 1 && (
        <YearRangeSlider
          minYear={years[0]}
          maxYear={years[years.length - 1]}
          from={fromYear}
          to={toYear}
          onCommit={(from, to) =>
            setSelection({ fromYear: from, toYear: to }, { reRunServer: false })
          }
        />
      )}
    </div>
  );
}
```

(This also folds in Task 4's `reRunServer: false` change for this file's partner-change call — see the note at the top of Task 4.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run features/trade-data/ui/components/__tests__/ProductsViewControls.test.tsx`
Expected: PASS (all 3 existing tests).

- [ ] **Step 5: Typecheck and lint**

Run: `npx eslint features/trade-data/ui/components/ProductsViewControls.tsx features/trade-data/ui/components/__tests__/ProductsViewControls.test.tsx`
Expected: clean. (`tsc` will still show the pre-existing `ui/index.tsx` mismatch until Task 5 — same note as Task 1.)

- [ ] **Step 6: Commit**

```bash
git add features/trade-data/ui/components/ProductsViewControls.tsx features/trade-data/ui/components/__tests__/ProductsViewControls.test.tsx
git commit -m "Make ProductsViewControls read its partner from useChartSelection"
```

---

### Task 3: Mark `CountryViewControls`'s products-change as client-only

**Why:** Once Task 5 makes the RSC fetch every product unconditionally, switching which products are compared in the countries view no longer needs a server re-fetch — `StackedChartPanel` already filters its full `rows` array by the `products` prop itself (`selectStackedSeries`), so it already works correctly against an unfiltered `totalsByCountry`. This one-line change is safe to land now, before Task 5: today, switching products *would* still hit the server (as `reRunServer` defaults to `true`), so marking it `false` a task early would show stale data until Task 5 lands. To avoid that intermediate gap, do this task and Task 5 in the same sitting before shipping — or, if shipping incrementally, do this task *last*, immediately before Task 5, rather than here. **Recommended order: do Tasks 1–2 now, then Tasks 3–4 immediately before Task 5, in the same batch.**

**Files:**
- Modify: `features/trade-data/ui/components/CountryViewControls.tsx`

**Interfaces:**
- No signature changes — only the options object passed to an existing `setSelection` call changes.

- [ ] **Step 1: Implement the change**

In `features/trade-data/ui/components/CountryViewControls.tsx`, change:

```tsx
      <ProductMultiSelect
        products={availableProducts}
        value={selection.products}
        onChange={(products) => setSelection({ products })}
        max={MAX_PRODUCTS}
        pending={isPending}
      />
```

to:

```tsx
      <ProductMultiSelect
        products={availableProducts}
        value={selection.products}
        onChange={(products) => setSelection({ products }, { reRunServer: false })}
        max={MAX_PRODUCTS}
        pending={isPending}
      />
```

- [ ] **Step 2: Run the existing test file to confirm nothing broke**

Run: `npx vitest run features/trade-data/ui/components/__tests__/CountryViewControls.test.tsx`
Expected: PASS (these are static-render tests; they don't simulate the `onChange` interaction, so this change is invisible to them — that's expected, not a gap this task needs to close, since Headless UI's interactive pickers need a jsdom+user-event harness this codebase doesn't use for these components).

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint features/trade-data/ui/components/CountryViewControls.tsx`
Expected: both clean.

- [ ] **Step 4: Commit**

```bash
git add features/trade-data/ui/components/CountryViewControls.tsx
git commit -m "Make CountryViewControls's product picker client-only"
```

---

### Task 4: Mark `ChartTabs`'s view switch as client-only

**Why:** Same reasoning as Task 3 — once every product/partner's data is always loaded (Task 5), switching tabs needs no server round-trip. **Same ordering caveat as Task 3: do this immediately before Task 5, in the same batch, to avoid an intermediate state where switching tabs shows stale data.**

**Files:**
- Modify: `features/trade-data/ui/components/ChartTabs.tsx`

**Interfaces:**
- No signature changes — only the options object passed to an existing `setSelection` call changes.

- [ ] **Step 1: Implement the change**

In `features/trade-data/ui/components/ChartTabs.tsx`, change:

```tsx
      onChange={(i) => setSelection({ ...PIVOT_CLEARED, view: VIEWS[i] })}
```

to:

```tsx
      onChange={(i) => setSelection({ ...PIVOT_CLEARED, view: VIEWS[i] }, { reRunServer: false })}
```

- [ ] **Step 2: Run the existing test file to confirm nothing broke**

Run: `npx vitest run features/trade-data/ui/components/__tests__/ChartTabs.test.tsx`
Expected: PASS (same reasoning as Task 3 Step 2 — these tests check rendered markup for two different `search` values, not the live `onChange` interaction).

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint features/trade-data/ui/components/ChartTabs.tsx`
Expected: both clean.

- [ ] **Step 4: Commit**

```bash
git add features/trade-data/ui/components/ChartTabs.tsx
git commit -m "Make ChartTabs's view switch client-only"
```

---

### Task 5: Fetch everything unconditionally in the RSC, and split the view-conditional rendering into client components

**Why:** This is the task that actually removes both `searchParams` reads from the RSC — the one that decides *what to fetch* (replaced by "always fetch both products, unconditionally") and the one that decides *which JSX to render* (replaced by two new client components that make that call from `useChartSelection()` instead). After this task, nothing in `FertilizerImports`'s render path touches `searchParams`, which is the precondition for Task 6 (removing `force-dynamic`) to actually change anything.

**Files:**
- Create: `features/trade-data/ui/components/FertilizerImportsChart.tsx`
- Create: `features/trade-data/ui/components/FertilizerImportsControls.tsx`
- Modify: `features/trade-data/ui/index.tsx`

**Interfaces:**
- `FertilizerImportsChart` consumes: `useChartSelection()` → `{ selection: { view: "countries" | "products", ... } }`. Props: `{ availablePartners: { code: string; name: string }[], allTotals: { product: string; totals: YearlyPartnerTotal[] }[] }`.
- `FertilizerImportsControls` consumes: same `useChartSelection()` read. Props: `{ availableProducts: string[], availablePartners: { code: string; name: string }[], allTotals: { product: string; totals: YearlyPartnerTotal[] }[] }`.
- Both produce: nothing further downstream depends on new exports — `FertilizerImportsCountryView`, `FertilizerImportsProductsView`, `CountryViewControls`, `ProductsViewControls` all keep their existing prop shapes from Tasks 1–2 (`totalsByCountry`/`totalsByProduct` as `{ product: string; totals: YearlyPartnerTotal[] }[]`, no `partner` prop).

- [ ] **Step 1: Create `FertilizerImportsChart.tsx`**

```tsx
"use client";

import type { YearlyPartnerTotal } from "@/features/trade-data/types";
import { useChartSelection } from "@/features/trade-data/ui/hooks/useChartSelection";
import { FertilizerImportsCountryView } from "@/features/trade-data/ui/components/FertilizerImportsCountryView";
import { FertilizerImportsProductsView } from "@/features/trade-data/ui/components/FertilizerImportsProductsView";

/**
 * Picks which chart to render for the active tab. Split out of the RSC so
 * the RSC never has to read `?view=` itself — reading searchParams at all,
 * for any reason, opts a Server Component into per-request dynamic
 * rendering, which this page no longer needs now that it always fetches
 * every product for every partner up front (see ui/index.tsx).
 */
export function FertilizerImportsChart({
  availablePartners,
  allTotals,
}: {
  availablePartners: { code: string; name: string }[];
  allTotals: { product: string; totals: YearlyPartnerTotal[] }[];
}) {
  const { selection } = useChartSelection();

  return selection.view === "countries" ? (
    <FertilizerImportsCountryView
      availablePartners={availablePartners}
      totalsByCountry={allTotals}
    />
  ) : (
    <FertilizerImportsProductsView
      availablePartners={availablePartners}
      totalsByProduct={allTotals}
    />
  );
}
```

- [ ] **Step 2: Create `FertilizerImportsControls.tsx`**

```tsx
"use client";

import type { YearlyPartnerTotal } from "@/features/trade-data/types";
import { useChartSelection } from "@/features/trade-data/ui/hooks/useChartSelection";
import { CountryViewControls } from "@/features/trade-data/ui/components/CountryViewControls";
import { ProductsViewControls } from "@/features/trade-data/ui/components/ProductsViewControls";

/** Same split as FertilizerImportsChart, for the sidebar's controls row. */
export function FertilizerImportsControls({
  availableProducts,
  availablePartners,
  allTotals,
}: {
  availableProducts: string[];
  availablePartners: { code: string; name: string }[];
  allTotals: { product: string; totals: YearlyPartnerTotal[] }[];
}) {
  const { selection } = useChartSelection();

  return selection.view === "countries" ? (
    <CountryViewControls
      availableProducts={availableProducts}
      availablePartners={availablePartners}
      totalsByCountry={allTotals}
    />
  ) : (
    <ProductsViewControls
      availableProducts={availableProducts}
      availablePartners={availablePartners}
      totalsByProduct={allTotals}
    />
  );
}
```

- [ ] **Step 3: Rewrite `features/trade-data/ui/index.tsx`**

Replace the entire file with:

```tsx
import "server-only";
import { COMEXT_PRODUCTS } from "@/features/trade-data/constants/comextProducts";
import { getComextPartners } from "@/features/trade-data/db/queries/getComextPartners";
import { getComextYearlyTonnesByPartner } from "@/features/trade-data/lib/getComextYearlyTonnesByPartner";
import { ChartTabs } from "@/features/trade-data/ui/components/ChartTabs";
import { EventsPanel } from "@/features/trade-data/ui/components/EventsPanel";
import { FertilizerImportsChart } from "@/features/trade-data/ui/components/FertilizerImportsChart";
import { FertilizerImportsControls } from "@/features/trade-data/ui/components/FertilizerImportsControls";

/**
 * The feature's entry point. Statically rendered at `next build` time —
 * every product's totals for every partner (~146 KB total, measured
 * against the full dataset) are fetched once here, unconditionally, and
 * handed to two client components (FertilizerImportsChart/Controls) that
 * pick what to show from the URL (?view=, ?products=, ?partner=,
 * ?countries=, ...) entirely in the browser via useChartSelection. The
 * RSC never reads `searchParams` — doing so, for any reason, would opt
 * this page back into per-request dynamic rendering. COMEXT (Eurostat's
 * validated monthly statistics) is the only data source — see
 * architecture-decisions.md.
 */
export async function FertilizerImports() {
  const availableProducts: string[] = [...COMEXT_PRODUCTS];
  const [availablePartners, allTotals] = await Promise.all([
    getComextPartners(),
    Promise.all(
      availableProducts.map(async (product) => ({
        product,
        totals: await getComextYearlyTonnesByPartner(product),
      })),
    ),
  ]);

  return (
    <main className="mx-auto max-w-[90rem] px-6 pt-6 pb-20 md:pb-6">
      {/* header lives inside the main column (not spanning full width above
          the grid) so its top edge lines up with the sidebar's first item —
          both start at the grid's own top, per items-start below. */}
      {/* md:, not lg: — the sidebar (tabs, controls, events) sits beside
          the chart from tablet width up, not just laptop-or-wider, so it
          never has to steal a whole row's height from the chart column. */}
      <div className="grid gap-8 md:grid-cols-[1fr_17rem] md:items-start">
        {/* min-w-0: without it the 1fr track grows to the data table's
            intrinsic width (grid items default to min-width:auto), shoving
            the sidebar off-screen. With it, the table scrolls inside its
            own overflow-x-auto instead. */}
        <div className="min-w-0">
          <header className="max-w-[34rem]">
            <h1 className="text-[1.75rem] leading-[1.15] font-semibold tracking-[-0.01em]">
              Where the EU&rsquo;s fertiliser comes from
            </h1>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">
              EU fertiliser import volumes, by partner country or by product,
              across the years on record.
            </p>
          </header>
          <div className="mt-6">
            <FertilizerImportsChart
              availablePartners={availablePartners}
              allTotals={allTotals}
            />
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <ChartTabs />
          <FertilizerImportsControls
            availableProducts={availableProducts}
            availablePartners={availablePartners}
            allTotals={allTotals}
          />
          <EventsPanel />
        </div>
      </div>
    </main>
  );
}
```

This drops the `SearchParams` type alias, the `toURLSearchParams` helper, `parseSelection`, and the `searchParams` prop entirely — none of them are used anywhere else in the codebase (verify in Step 4).

- [ ] **Step 4: Confirm nothing else depends on what was removed**

Run: `grep -rn "toURLSearchParams" --include="*.ts" --include="*.tsx" .`
Expected: no matches (it was only defined and used in this file).

- [ ] **Step 5: Typecheck the whole project**

Run: `npx tsc --noEmit`
Expected: clean. This is the point where the Task 1/2 "expected, ignore for now" `tsc` mismatches (RSC still passing a `partner` prop / old shape) should have resolved, since `ui/index.tsx` no longer computes or passes anything resembling the old per-view-scoped props.

- [ ] **Step 6: Lint the new and changed files**

Run: `npx eslint features/trade-data/ui/components/FertilizerImportsChart.tsx features/trade-data/ui/components/FertilizerImportsControls.tsx features/trade-data/ui/index.tsx`
Expected: clean.

- [ ] **Step 7: Run the full test suite**

Run: `npm run test:unit`
Expected: all pass. (This task touches no DB-backed integration test — `test:unit` is sufficient and faster; run the full `npm test` in Task 7's final verification.)

- [ ] **Step 8: Commit**

```bash
git add features/trade-data/ui/components/FertilizerImportsChart.tsx features/trade-data/ui/components/FertilizerImportsControls.tsx features/trade-data/ui/index.tsx
git commit -m "Make FertilizerImports fetch everything unconditionally"
```

---

### Task 6: Remove `force-dynamic` from `app/page.tsx`

**Why:** With Task 5 landed, nothing in the render path reads `searchParams` anymore, so the explicit flag (which was only ever a defensive restatement of what `searchParams` access already forced) is dead weight — and, more importantly, actively wrong: it would keep forcing dynamic rendering even though nothing requires it anymore.

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- `FertilizerImports` (from Task 5) takes no props. `Home` takes no props.

- [ ] **Step 1: Rewrite `app/page.tsx`**

```tsx
import { Suspense } from "react";
import { FertilizerImports } from "@/features/trade-data/ui";

export default function Home() {
  return (
    <Suspense fallback={<div className="p-6 text-muted">Loading…</div>}>
      <FertilizerImports />
    </Suspense>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Lint**

Run: `npx eslint app/page.tsx`
Expected: clean.

- [ ] **Step 4: Build and confirm the route is now static**

Run: `npm run build`
Expected: in the route summary Next.js prints, `/` is marked `○ (Static)`, not `ƒ (Dynamic)` — compare against the build from before this plan, which printed:

```
Route (app)
┌ ƒ /
├ ○ /_not-found
├ ƒ /api/comext-refresh
├ ƒ /api/fertilizer-sync
├ ƒ /globe
└ ○ /ru-trade-timeline
```

`/` should now have the `○` marker instead of `ƒ`.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx
git commit -m "Remove force-dynamic from the fertilizer imports page"
```

---

### Task 7: Full verification

**Why:** Confirm the whole change set is correct end-to-end — automated checks plus the same kind of manual, real-browser verification this session already did for the earlier query-optimization work on this same feature.

**Files:** None (verification only).

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: all pass (unit + integration).

- [ ] **Step 2: Typecheck and lint the whole project**

Run: `npx tsc --noEmit && npx eslint .`
Expected: both clean.

- [ ] **Step 3: Start the production build and verify in a real browser**

```bash
npm run build
npm run start &
```

Then, with a headless browser (Playwright, already used in this session for prior verification — see any earlier `verify-*.mjs` script in this repo's session scratch history for the pattern), check:
- `http://localhost:3000/` — countries view renders with the same bar values as before this change (Ammonia, Russia selected by default).
- `http://localhost:3000/?view=products&partner=RU` — products view renders with the same bar values as before.
- Switching tabs, changing the product selection, changing the partner, and changing the year range all still work and update the chart, with **no full-page reload and no new network request to `/`** (open the browser's network panel or check `page.on("request")` in a script — after this plan, none of `setSelection`'s call sites trigger `router.push` anymore, so no request should fire for any of these interactions).
- Zero console errors during any of the above.

- [ ] **Step 4: Confirm the URL is still shareable**

Load `http://localhost:3000/?view=products&partner=RU&products=Ammonia` directly (a fresh navigation, not a client-side transition) and confirm it renders the correct initial state — this exercises `useChartSelection`'s `parseSelection(useSearchParams())` read on first client render, proving deep links still work even though the RSC itself never looked at the query string.

- [ ] **Step 5: Stop the production server**

```bash
lsof -ti:3000 -sTCP:LISTEN | xargs -r kill
```

---

## Self-Review

**Spec coverage:**
- ✅ "Stop force-dynamic, so Next sends all the data with the page" → Tasks 5–6.
- ✅ "Don't change any client-side stuff" (user-facing behavior) → verified explicitly in Task 7 Step 3; the only client-*code* touches are the minimal, behavior-preserving ones flagged honestly in Tasks 1–4, each justified as either a no-op at time of landing or a strictly-necessary consequence of the goal (identified and disclosed to the user before this plan was written).
- ✅ Data-volume safety margin (~146 KB / ~20 KB gzip) → cited in the Architecture section and `ui/index.tsx`'s new docstring; no separate task needed since it's a already-measured fact, not something to implement.

**Placeholder scan:** No "TBD"/"handle edge cases"/"similar to Task N" phrases; every code step is a complete, real file or diff.

**Type consistency:** `{ product: string; totals: YearlyPartnerTotal[] }[]` is the one shape threaded through `ui/index.tsx` → `FertilizerImportsChart`/`FertilizerImportsControls` → `FertilizerImportsCountryView`/`FertilizerImportsProductsView`/`CountryViewControls`/`ProductsViewControls`, named `allTotals` at the top and re-labeled `totalsByCountry`/`totalsByProduct` only at the two leaf props that already expected those names (unchanged from before this plan, so no downstream file needs touching). `selection.partner: string` is read the same way in both places that now use it (Tasks 1–2).

**Known, disclosed follow-up (not required for this plan's goal):** After this plan lands, `useChartSelection`'s `reRunServer: true` branch (`router.push` + `isPending`/`startTransition`) has no remaining caller anywhere in the codebase — every `setSelection` call site now passes `reRunServer: false`. That machinery still works correctly and isn't wrong to keep, but it's worth a human decision (not bundled into this plan) on whether to simplify `useChartSelection.ts` itself in a follow-up change, since removing it is a separate judgment call from "make the page static."
