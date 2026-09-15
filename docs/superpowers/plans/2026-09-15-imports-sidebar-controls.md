# Imports Sidebar Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Move the Imports page's tab switcher and controls (product/country pickers, year-range slider) out of the main column and into the sidebar, above `EventsPanel`, so the chart is visible on a 13" MacBook without scrolling.

**Architecture:** Extract two new self-contained client components (`CountryViewControls`, `ProductsViewControls`), one per tab, that read/write the URL selection themselves via the existing `useChartSelection()` hook — the same pattern `ChartTabs` already uses, so no prop drilling or context is needed. The two view components (`FertilizerImportsCountryView`, `FertilizerImportsProductsView`) shrink to just their chart panel. `index.tsx` (the page's RSC) drops the sidebar breakpoint from `lg:` to `md:` and moves `ChartTabs` from the top of the main column into the sidebar, above the new Controls component and `EventsPanel`.

**Tech Stack:** Next.js App Router, React (client components), Tailwind CSS, Vitest (`renderToStaticMarkup`-based tests, no interactive-component testing set up in this repo).

**Spec:** `docs/superpowers/specs/2026-09-15-imports-sidebar-controls-design.md`

## Global Constraints

- Every import uses the `@/...` alias — no relative paths (eslint-enforced, autofixable).
- A file in `features/<f>` may import its own feature, `@/lib`, and the shared root folders — never another feature directly.
- Commit subjects must start with an approved verb: Add, Cut, Fix, Bump, Make, Start, Stop, Refactor, Reformat, Optimize, Document.
- No comments explaining *what* code does — only comments on non-obvious *why* (matches this codebase's existing style, visible throughout the files this plan touches).
- Run `npm run test:unit` and `npm run lint` after every task; both must be clean before committing.

---

### Task 1: Extract `CountryViewControls`

**Files:**
- Create: `features/trade-data/ui/components/CountryViewControls.tsx`
- Test: `features/trade-data/ui/components/__tests__/CountryViewControls.test.tsx`
- Modify: `features/trade-data/lib/chartSelectionParams.ts` (add `NARROW_CHART_BREAKPOINT`)

**Interfaces:**
- Consumes: `useChartSelection()` → `{ selection: ChartSelection, setSelection, isPending }` (`features/trade-data/ui/hooks/useChartSelection.ts`); `useIsMobile(breakpointPx?: number): boolean` (`features/hooks/useIsMobile.ts`); `deriveBounds(rows): { years: number[] }`, `deriveYearRange(selection, years, maxSpan?): { fromYear, toYear }`, `MAX_PRODUCTS`, `MAX_YEAR_SPAN_MOBILE` (`features/trade-data/lib/chartSelectionParams.ts`); `CountryCombobox`, `YearRangeSlider` (sibling components); `ProductMultiSelect` (`features/components/ProductMultiSelect.tsx`); `YearlyPartnerTotal` (`features/trade-data/types.ts`).
- Produces: `CountryViewControls({ availableProducts: string[], availablePartners: {code,name}[], totalsByCountry: {product: string, totals: YearlyPartnerTotal[]}[] })` — a React component. `NARROW_CHART_BREAKPOINT: number` — exported for Task 3 to reuse.

- [x] **Step 1: Add `NARROW_CHART_BREAKPOINT` to `chartSelectionParams.ts`**

Add near `MAX_YEAR_SPAN_MOBILE` (after its declaration, `features/trade-data/lib/chartSelectionParams.ts:15`):

```ts
/**
 * Viewport width, in px, below which the sidebar either hasn't appeared
 * yet (phones) or has just claimed space from the chart column — both
 * need MAX_YEAR_SPAN_MOBILE's leaner per-bar label spacing. Matches the
 * breakpoint the sidebar's own two-column layout switches on.
 */
export const NARROW_CHART_BREAKPOINT = 1024;
```

- [x] **Step 2: Write the failing test**

Create `features/trade-data/ui/components/__tests__/CountryViewControls.test.tsx`:

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const setSelection = vi.fn();
let selection = {
  view: "countries" as const,
  partnerCodes: ["EG"],
  partner: "",
  products: ["Ammonia"],
  fromYear: undefined as number | undefined,
  toYear: undefined as number | undefined,
};

vi.mock("@/features/trade-data/ui/hooks/useChartSelection", () => ({
  useChartSelection: () => ({ selection, setSelection, isPending: false }),
}));
vi.mock("@/features/hooks/useIsMobile", () => ({
  useIsMobile: () => false,
}));

import { CountryViewControls } from "@/features/trade-data/ui/components/CountryViewControls";

const props = {
  availableProducts: ["Ammonia", "Nitrogenous fertilisers"],
  availablePartners: [
    { code: "EG", name: "Egypt" },
    { code: "MA", name: "Morocco" },
  ],
  totalsByCountry: [
    {
      product: "Ammonia",
      totals: [
        { year: "2020", partnerCode: "EG", partner: "Egypt", tonnes: 90 },
        { year: "2021", partnerCode: "EG", partner: "Egypt", tonnes: 100 },
      ],
    },
  ],
};

describe("CountryViewControls", () => {
  beforeEach(() => {
    setSelection.mockClear();
    selection = { ...selection, partnerCodes: ["EG"], products: ["Ammonia"] };
  });

  it("renders the multi-select product picker", () => {
    const html = renderToStaticMarkup(<CountryViewControls {...props} />);
    expect(html).toContain("Products");
  });

  it("renders the countries combobox", () => {
    const html = renderToStaticMarkup(<CountryViewControls {...props} />);
    expect(html).toContain("Countries");
  });

  it("renders the year range slider when more than one year is in the data", () => {
    const html = renderToStaticMarkup(<CountryViewControls {...props} />);
    expect(html).toContain("Years:");
  });
});
```

- [x] **Step 3: Run test to verify it fails**

Run: `npx vitest run --project unit features/trade-data/ui/components/__tests__/CountryViewControls.test.tsx`
Expected: FAIL — `Cannot find module '@/features/trade-data/ui/components/CountryViewControls'`

- [x] **Step 4: Write the component**

Create `features/trade-data/ui/components/CountryViewControls.tsx`:

```tsx
"use client";

import type { YearlyPartnerTotal } from "@/features/trade-data/types";
import {
  MAX_PRODUCTS,
  MAX_YEAR_SPAN_MOBILE,
  NARROW_CHART_BREAKPOINT,
  deriveBounds,
  deriveYearRange,
} from "@/features/trade-data/lib/chartSelectionParams";
import { useChartSelection } from "@/features/trade-data/ui/hooks/useChartSelection";
import { useIsMobile } from "@/features/hooks/useIsMobile";
import { CountryCombobox } from "@/features/trade-data/ui/components/CountryCombobox";
import { ProductMultiSelect } from "@/features/components/ProductMultiSelect";
import { YearRangeSlider } from "@/features/trade-data/ui/components/YearRangeSlider";

/**
 * "Compare countries" tab's controls — product picker, country picker,
 * year-range slider. Lives in the page's sidebar column, above
 * EventsPanel; reads/writes the URL selection itself (useChartSelection),
 * so it stays in sync with FertilizerImportsCountryView without either
 * one needing to know the other exists.
 */
export function CountryViewControls({
  availableProducts,
  availablePartners,
  totalsByCountry,
}: {
  availableProducts: string[];
  availablePartners: { code: string; name: string }[];
  totalsByCountry: { product: string; totals: YearlyPartnerTotal[] }[];
}) {
  const { selection, setSelection, isPending } = useChartSelection();
  const isNarrow = useIsMobile(NARROW_CHART_BREAKPOINT);
  const maxYearSpan = isNarrow ? MAX_YEAR_SPAN_MOBILE : undefined;

  const allTotals = totalsByCountry.flatMap((t) => t.totals);
  const { years } = deriveBounds(allTotals);
  const { fromYear, toYear } = deriveYearRange(selection, years, maxYearSpan);

  return (
    <div className="flex flex-col gap-4 border-b border-border pb-6">
      <ProductMultiSelect
        products={availableProducts}
        value={selection.products}
        onChange={(products) => setSelection({ products })}
        max={MAX_PRODUCTS}
        pending={isPending}
      />
      <CountryCombobox
        partners={availablePartners}
        value={selection.partnerCodes}
        onChange={(partnerCodes) =>
          setSelection({ partnerCodes }, { reRunServer: false })
        }
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
          maxSpan={maxYearSpan}
        />
      )}
    </div>
  );
}
```

- [x] **Step 5: Run test to verify it passes**

Run: `npx vitest run --project unit features/trade-data/ui/components/__tests__/CountryViewControls.test.tsx`
Expected: PASS (3 tests)

- [x] **Step 6: Lint**

Run: `npm run lint`
Expected: no new errors or warnings from the two changed/new files.

- [x] **Step 7: Commit**

```bash
git add features/trade-data/lib/chartSelectionParams.ts \
        features/trade-data/ui/components/CountryViewControls.tsx \
        features/trade-data/ui/components/__tests__/CountryViewControls.test.tsx
git commit -m "Add CountryViewControls for the sidebar-relocated controls row"
```

---

### Task 2: Extract `ProductsViewControls`

**Files:**
- Create: `features/trade-data/ui/components/ProductsViewControls.tsx`
- Test: `features/trade-data/ui/components/__tests__/ProductsViewControls.test.tsx`

**Interfaces:**
- Consumes: same `useChartSelection`, `deriveBounds`, `deriveYearRange`, `MAX_PRODUCTS`, `CountryCombobox`, `ProductMultiSelect`, `YearRangeSlider` as Task 1. Does **not** use `MAX_YEAR_SPAN_MOBILE` / `NARROW_CHART_BREAKPOINT` — the products tab draws one bar per year (no per-bar country-code label), so it has no label-collision risk to cap for (matches today's `FertilizerImportsProductsView`, which never passes `maxSpan`).
- Produces: `ProductsViewControls({ availableProducts: string[], availablePartners: {code,name}[], partner: string, totalsByProduct: {product: string, totals: YearlyPartnerTotal[]}[] })`.

- [x] **Step 1: Write the failing test**

Create `features/trade-data/ui/components/__tests__/ProductsViewControls.test.tsx`:

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const setSelection = vi.fn();
let selection = {
  view: "products" as const,
  partnerCodes: [] as string[],
  partner: "EG",
  products: ["Ammonia"],
  fromYear: undefined as number | undefined,
  toYear: undefined as number | undefined,
};

vi.mock("@/features/trade-data/ui/hooks/useChartSelection", () => ({
  useChartSelection: () => ({ selection, setSelection, isPending: false }),
}));

import { ProductsViewControls } from "@/features/trade-data/ui/components/ProductsViewControls";

const props = {
  availableProducts: ["Ammonia", "Nitrogenous fertilisers"],
  availablePartners: [
    { code: "EG", name: "Egypt" },
    { code: "MA", name: "Morocco" },
  ],
  partner: "EG",
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

describe("ProductsViewControls", () => {
  beforeEach(() => {
    setSelection.mockClear();
    selection = { ...selection, partner: "EG", products: ["Ammonia"] };
  });

  it("renders the single-partner combobox labelled Partner", () => {
    const html = renderToStaticMarkup(<ProductsViewControls {...props} />);
    expect(html).toContain("Partner");
  });

  it("renders the multi-select product picker", () => {
    const html = renderToStaticMarkup(<ProductsViewControls {...props} />);
    expect(html).toContain("Products");
  });

  it("renders the year range slider when more than one year is in the data", () => {
    const html = renderToStaticMarkup(<ProductsViewControls {...props} />);
    expect(html).toContain("Years:");
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit features/trade-data/ui/components/__tests__/ProductsViewControls.test.tsx`
Expected: FAIL — `Cannot find module '@/features/trade-data/ui/components/ProductsViewControls'`

- [x] **Step 3: Write the component**

Create `features/trade-data/ui/components/ProductsViewControls.tsx`:

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
  partner,
  totalsByProduct,
}: {
  availableProducts: string[];
  availablePartners: { code: string; name: string }[];
  /** Authoritative during a refetch ("" = none picked yet). */
  partner: string;
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
        value={partner ? [partner] : []}
        onChange={(codes) => setSelection({ partner: codes[0] ?? "" })}
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

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit features/trade-data/ui/components/__tests__/ProductsViewControls.test.tsx`
Expected: PASS (3 tests)

- [x] **Step 5: Lint**

Run: `npm run lint`
Expected: no new errors or warnings.

- [x] **Step 6: Commit**

```bash
git add features/trade-data/ui/components/ProductsViewControls.tsx \
        features/trade-data/ui/components/__tests__/ProductsViewControls.test.tsx
git commit -m "Add ProductsViewControls for the sidebar-relocated controls row"
```

---

### Task 3: Trim both view components and rewire `index.tsx`

This is one task, not three, because the three files only compile and
render correctly together: `index.tsx` must stop passing
`availableProducts` to the view components in the same change that the
view components stop accepting it, and must start rendering the two new
Controls components (Tasks 1–2) in the same change that it stops
rendering them inside the views.

**Files:**
- Modify: `features/trade-data/ui/components/FertilizerImportsCountryView.tsx`
- Modify: `features/trade-data/ui/components/__tests__/FertilizerImportsCountryView.test.tsx`
- Modify: `features/trade-data/ui/components/FertilizerImportsProductsView.tsx`
- Create: `features/trade-data/ui/components/__tests__/FertilizerImportsProductsView.test.tsx`
- Modify: `features/trade-data/ui/index.tsx`

**Interfaces:**
- Consumes: `CountryViewControls`, `ProductsViewControls` (Tasks 1–2); `NARROW_CHART_BREAKPOINT`, `MAX_YEAR_SPAN_MOBILE` (Task 1); `ChartTabs`, `EventsPanel`, `StackedChartPanel`, `ImportsChartPanel` (existing, unchanged).
- Produces: `FertilizerImportsCountryView({ availablePartners, totalsByCountry })` — drops `availableProducts`. `FertilizerImportsProductsView({ availablePartners, partner, totalsByProduct })` — drops `availableProducts`. Both keep rendering only their chart panel; callers elsewhere in the codebase (there are none besides `index.tsx`) don't exist, so this is a safe, page-local prop-shape change.

- [x] **Step 1: Write the failing test for the trimmed `FertilizerImportsCountryView`**

Replace `features/trade-data/ui/components/__tests__/FertilizerImportsCountryView.test.tsx` in full:

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const setSelection = vi.fn();
let selection = {
  view: "countries" as const,
  partnerCodes: ["EG"],
  partner: "",
  products: ["Ammonia"],
  fromYear: undefined as number | undefined,
  toYear: undefined as number | undefined,
};

vi.mock("@/features/trade-data/ui/hooks/useChartSelection", () => ({
  useChartSelection: () => ({ selection, setSelection, isPending: false }),
}));
vi.mock("@/features/hooks/useIsMobile", () => ({
  useIsMobile: () => false,
}));

import { FertilizerImportsCountryView } from "@/features/trade-data/ui/components/FertilizerImportsCountryView";

const props = {
  availablePartners: [
    { code: "EG", name: "Egypt" },
    { code: "MA", name: "Morocco" },
  ],
  totalsByCountry: [
    {
      product: "Ammonia",
      totals: [
        { year: "2021", partnerCode: "EG", partner: "Egypt", tonnes: 100 },
      ],
    },
  ],
};

describe("FertilizerImportsCountryView", () => {
  beforeEach(() => {
    setSelection.mockClear();
    selection = { ...selection, partnerCodes: ["EG"], products: ["Ammonia"] };
  });

  it("renders a stacked chart for the selection, with no controls of its own", () => {
    const html = renderToStaticMarkup(<FertilizerImportsCountryView {...props} />);
    expect(html).toContain("by partner country");
    expect(html).toContain("chart-bar");
    expect(html).not.toContain("Products");
  });

  it("shows the country empty state when no partner is selected", () => {
    selection = { ...selection, partnerCodes: [] };
    const html = renderToStaticMarkup(<FertilizerImportsCountryView {...props} />);
    expect(html).toContain("Choose up to two partner countries");
    expect(html).not.toContain("chart-bar");
  });
});
```

(`not.toContain("Products")` checks for `ProductMultiSelect`'s static
label span, which renders regardless of what's selected — unlike a
placeholder-text check, this is the one that actually turns red against
today's untrimmed component, which always renders that label.)

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit features/trade-data/ui/components/__tests__/FertilizerImportsCountryView.test.tsx`
Expected: FAIL — a runtime `TypeError` inside `ProductMultiSelect` (it calls `.filter` on its `products` prop, which is `undefined` now that `props` no longer has `availableProducts` and the untrimmed component still passes it straight through). Vitest transpiles with esbuild and doesn't type-check, so this surfaces as a crash, not a compile error — `npm run build` would catch the missing prop as a real TS error too, but that's not part of this step.

- [x] **Step 3: Trim `FertilizerImportsCountryView.tsx`**

Replace `features/trade-data/ui/components/FertilizerImportsCountryView.tsx` in full:

```tsx
"use client";

import { useMemo } from "react";
import type { StackedSeriesPoint, YearlyPartnerTotal } from "@/features/trade-data/types";
import {
  MAX_YEAR_SPAN_MOBILE,
  NARROW_CHART_BREAKPOINT,
  deriveBounds,
  deriveYearRange,
} from "@/features/trade-data/lib/chartSelectionParams";
import { useChartSelection } from "@/features/trade-data/ui/hooks/useChartSelection";
import { useIsMobile } from "@/features/hooks/useIsMobile";
import { StackedChartPanel } from "@/features/trade-data/ui/components/StackedChartPanel";

/**
 * "Compare countries" tab's chart: up to 2 partner countries, up to 3
 * products, each country's bar a stack of product segments (colour =
 * product) with the partner code under every bar. Reads the URL
 * selection itself; the controls row lives in the sidebar
 * (CountryViewControls) and the shared chrome (heading, tabs) is the
 * RSC's.
 */
export function FertilizerImportsCountryView({
  availablePartners,
  totalsByCountry,
}: {
  availablePartners: { code: string; name: string }[];
  totalsByCountry: { product: string; totals: YearlyPartnerTotal[] }[];
}) {
  const { selection } = useChartSelection();
  const isNarrow = useIsMobile(NARROW_CHART_BREAKPOINT);
  const maxYearSpan = isNarrow ? MAX_YEAR_SPAN_MOBILE : undefined;

  const allTotals = useMemo(
    () => totalsByCountry.flatMap((t) => t.totals),
    [totalsByCountry],
  );
  const { years } = useMemo(() => deriveBounds(allTotals), [allTotals]);
  const { fromYear, toYear } = deriveYearRange(selection, years, maxYearSpan);
  const partialYear = years.length ? years[years.length - 1] : undefined;

  const rows = useMemo<StackedSeriesPoint[]>(
    () =>
      totalsByCountry.flatMap(({ product, totals }) =>
        totals.map((t) => ({
          partnerCode: t.partnerCode,
          product,
          year: Number(t.year),
          tonnes: t.tonnes,
        })),
      ),
    [totalsByCountry],
  );

  const nameForCountry = (code: string) =>
    availablePartners.find((p) => p.code === code)?.name ?? code;

  return (
    <StackedChartPanel
      rows={rows}
      partnerCodes={selection.partnerCodes}
      products={selection.products}
      nameForCountry={nameForCountry}
      ariaLabel={(names) =>
        `EU imports in tonnes per year for ${names}, by partner country`
      }
      fromYear={fromYear}
      toYear={toYear}
      partialYear={partialYear}
    />
  );
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit features/trade-data/ui/components/__tests__/FertilizerImportsCountryView.test.tsx`
Expected: PASS (2 tests)

- [x] **Step 5: Write the failing test for the trimmed `FertilizerImportsProductsView`**

Create `features/trade-data/ui/components/__tests__/FertilizerImportsProductsView.test.tsx`:

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const setSelection = vi.fn();
let selection = {
  view: "products" as const,
  partnerCodes: [] as string[],
  partner: "EG",
  products: ["Ammonia"],
  fromYear: undefined as number | undefined,
  toYear: undefined as number | undefined,
};

vi.mock("@/features/trade-data/ui/hooks/useChartSelection", () => ({
  useChartSelection: () => ({ selection, setSelection, isPending: false }),
}));

import { FertilizerImportsProductsView } from "@/features/trade-data/ui/components/FertilizerImportsProductsView";

const props = {
  availablePartners: [
    { code: "EG", name: "Egypt" },
    { code: "MA", name: "Morocco" },
  ],
  partner: "EG",
  totalsByProduct: [
    {
      product: "Ammonia",
      totals: [
        { year: "2021", partnerCode: "EG", partner: "Egypt", tonnes: 100 },
      ],
    },
  ],
};

describe("FertilizerImportsProductsView", () => {
  beforeEach(() => {
    setSelection.mockClear();
    selection = { ...selection, partner: "EG", products: ["Ammonia"] };
  });

  it("renders a grouped bar chart for the selection, with no controls of its own", () => {
    const html = renderToStaticMarkup(<FertilizerImportsProductsView {...props} />);
    expect(html).toContain("chart-bar");
    expect(html).not.toContain("Partner");
  });

  it("shows the products empty state when no partner or product is selected", () => {
    selection = { ...selection, partner: "", products: [] };
    const html = renderToStaticMarkup(
      <FertilizerImportsProductsView {...props} partner="" />,
    );
    expect(html).toContain("Choose a partner country to compare products");
    expect(html).not.toContain("chart-bar");
  });
});
```

(`ImportsChartPanel`'s empty state is gated on `seriesKeys.length === 0` —
i.e. `selection.products`, not `partner` — so this test has to clear
both to reach the partner-specific message, not just pass `partner=""`.)

- [x] **Step 6: Run test to verify it fails**

Run: `npx vitest run --project unit features/trade-data/ui/components/__tests__/FertilizerImportsProductsView.test.tsx`
Expected: FAIL — the same kind of runtime `TypeError` as Task 3 Step 2: the untrimmed component still renders `ProductMultiSelect` with `products={availableProducts}`, which is `undefined` since `props` no longer supplies it.

- [x] **Step 7: Trim `FertilizerImportsProductsView.tsx`**

Replace `features/trade-data/ui/components/FertilizerImportsProductsView.tsx` in full:

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
 */
export function FertilizerImportsProductsView({
  availablePartners,
  partner,
  totalsByProduct,
}: {
  availablePartners: { code: string; name: string }[];
  /** Authoritative during a refetch ("" = none picked yet). */
  partner: string;
  totalsByProduct: { product: string; totals: YearlyPartnerTotal[] }[];
}) {
  const { selection } = useChartSelection();

  const allTotals = totalsByProduct.flatMap((t) => t.totals);
  const { years } = deriveBounds(allTotals);
  const { fromYear, toYear } = deriveYearRange(selection, years);
  const partialYear = years.length ? years[years.length - 1] : undefined;

  const rows = totalsByProduct.flatMap(({ product, totals }) =>
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

- [x] **Step 8: Run test to verify it passes**

Run: `npx vitest run --project unit features/trade-data/ui/components/__tests__/FertilizerImportsProductsView.test.tsx`
Expected: PASS (2 tests)

- [x] **Step 9: Rewire `index.tsx`**

Read `features/trade-data/ui/index.tsx` first to confirm line numbers haven't shifted, then replace the leading docstring, the imports block, and the `tab` + `return` section.

Docstring — replace:

```ts
/**
 * The feature's self-fetching entry point. Parses the URL once (bounds-free,
 * same parser the client uses), fetches only what the active view needs, and
 * renders the page: shared chrome (heading, tabs) + the tab. COMEXT (Eurostat's
 * validated monthly statistics) is the only data source — see
 * architecture-decisions.md.
 *
 * - countries: each selected product's totals for every partner (client stacks
 *   the products and filters the partners)
 * - products:  every product's totals for one partner (client filters products)
 */
```

with:

```ts
/**
 * The feature's self-fetching entry point. Parses the URL once (bounds-free,
 * same parser the client uses), fetches only what the active view needs, and
 * renders the page: the chart in the main column, and the tab switcher +
 * that tab's controls + EventsPanel in the sidebar. COMEXT (Eurostat's
 * validated monthly statistics) is the only data source — see
 * architecture-decisions.md.
 *
 * - countries: each selected product's totals for every partner (client stacks
 *   the products and filters the partners)
 * - products:  every product's totals for one partner (client filters products)
 */
```

Imports — replace:

```ts
import { ChartTabs } from "@/features/trade-data/ui/components/ChartTabs";
import { EventsPanel } from "@/features/trade-data/ui/components/EventsPanel";
import { FertilizerImportsCountryView } from "@/features/trade-data/ui/components/FertilizerImportsCountryView";
import { FertilizerImportsProductsView } from "@/features/trade-data/ui/components/FertilizerImportsProductsView";
import { parseSelection } from "@/features/trade-data/lib/chartSelectionParams";
```

with:

```ts
import { ChartTabs } from "@/features/trade-data/ui/components/ChartTabs";
import { CountryViewControls } from "@/features/trade-data/ui/components/CountryViewControls";
import { EventsPanel } from "@/features/trade-data/ui/components/EventsPanel";
import { FertilizerImportsCountryView } from "@/features/trade-data/ui/components/FertilizerImportsCountryView";
import { FertilizerImportsProductsView } from "@/features/trade-data/ui/components/FertilizerImportsProductsView";
import { ProductsViewControls } from "@/features/trade-data/ui/components/ProductsViewControls";
import { parseSelection } from "@/features/trade-data/lib/chartSelectionParams";
```

Body — replace from `const tab =` through the end of the function:

```tsx
  const tab =
    view === "countries" ? (
      <FertilizerImportsCountryView
        availableProducts={availableProducts}
        availablePartners={availablePartners}
        totalsByCountry={totalsByCountry}
      />
    ) : (
      <FertilizerImportsProductsView
        availableProducts={availableProducts}
        availablePartners={availablePartners}
        partner={partner}
        totalsByProduct={totalsByProduct}
      />
    );

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="max-w-[34rem]">
        <h1 className="text-[1.75rem] leading-[1.15] font-semibold tracking-[-0.01em]">
          Where the EU&rsquo;s fertiliser comes from
        </h1>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">
          EU fertiliser import volumes, by partner country or by product,
          across the years on record.
        </p>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_17rem] lg:items-start">
        {/* min-w-0: without it the 1fr track grows to the data table's
            intrinsic width (grid items default to min-width:auto), shoving
            the events panel off-screen. With it, the table scrolls inside
            its own overflow-x-auto instead. */}
        <div className="min-w-0">
          <div className="mb-6">
            <ChartTabs />
          </div>
          {tab}
        </div>
        <EventsPanel />
      </div>
    </main>
  );
```

with:

```tsx
  const chartView =
    view === "countries" ? (
      <FertilizerImportsCountryView
        availablePartners={availablePartners}
        totalsByCountry={totalsByCountry}
      />
    ) : (
      <FertilizerImportsProductsView
        availablePartners={availablePartners}
        partner={partner}
        totalsByProduct={totalsByProduct}
      />
    );

  const controlsView =
    view === "countries" ? (
      <CountryViewControls
        availableProducts={availableProducts}
        availablePartners={availablePartners}
        totalsByCountry={totalsByCountry}
      />
    ) : (
      <ProductsViewControls
        availableProducts={availableProducts}
        availablePartners={availablePartners}
        partner={partner}
        totalsByProduct={totalsByProduct}
      />
    );

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="max-w-[34rem]">
        <h1 className="text-[1.75rem] leading-[1.15] font-semibold tracking-[-0.01em]">
          Where the EU&rsquo;s fertiliser comes from
        </h1>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">
          EU fertiliser import volumes, by partner country or by product,
          across the years on record.
        </p>
      </header>

      {/* md:, not lg: — the sidebar (tabs, controls, events) sits beside
          the chart from tablet width up, not just laptop-or-wider, so it
          never has to steal a whole row's height from the chart column. */}
      <div className="mt-8 grid gap-8 md:grid-cols-[1fr_17rem] md:items-start">
        {/* min-w-0: without it the 1fr track grows to the data table's
            intrinsic width (grid items default to min-width:auto), shoving
            the sidebar off-screen. With it, the table scrolls inside its
            own overflow-x-auto instead. */}
        <div className="min-w-0">{chartView}</div>
        <div className="flex flex-col gap-6">
          <ChartTabs />
          {controlsView}
          <EventsPanel />
        </div>
      </div>
    </main>
  );
```

- [x] **Step 10: Run the full unit suite**

Run: `npm run test:unit`
Expected: PASS, all files (60+ files, 300+ tests).

- [x] **Step 11: Lint**

Run: `npm run lint`
Expected: no new errors or warnings.

- [x] **Step 12: Commit**

```bash
git add features/trade-data/ui/components/FertilizerImportsCountryView.tsx \
        features/trade-data/ui/components/__tests__/FertilizerImportsCountryView.test.tsx \
        features/trade-data/ui/components/FertilizerImportsProductsView.tsx \
        features/trade-data/ui/components/__tests__/FertilizerImportsProductsView.test.tsx \
        features/trade-data/ui/index.tsx
git commit -m "Refactor the Imports page to render tabs and controls in the sidebar"
```

---

### Task 4: Verify in the browser

No code changes — this task confirms the redesign actually achieves the
goal (chart visible with no scroll on a 13" MacBook) rather than just
compiling and passing unit tests.

**Files:** none.

- [x] **Step 1: Start the dev server**

Run: `npm run dev &` then poll until it's serving:
`timeout 30 bash -c 'until curl -sf http://localhost:3000 >/dev/null; do sleep 1; done'`

- [x] **Step 2: Check three widths with Playwright**

Using the same approach as the globe fix's verification (a small script
via `chromium.launch()` — see the "Fix globe canvas sizing" commit for
the pattern, including how to resolve a cached Playwright install via
`NODE_PATH`/symlink if it's not a project dependency), load `/` at:

- 1440×780 (13" MacBook target) — assert `document.documentElement.scrollHeight <= clientHeight` and that the bar chart (`.chart-bar`) is present in a screenshot without scrolling.
- 850×900 (the `md`–`lg` squeeze zone) — assert the sidebar (tabs, controls, `Events`) renders beside the chart, not below it, and that the chart's bars render without visually overlapping labels.
- 500×900 (phone) — assert the chart renders above the tabs/controls/events in DOM order (query each element's `getBoundingClientRect().top`).

- [x] **Step 3: Look at the screenshots**

Confirm visually: sidebar shows tabs → controls → Events top-to-bottom at
1440×780 and 850×900; no layout overlap or clipped text; the year-range
slider and comboboxes are usable widths in the ~17rem sidebar column.

- [x] **Step 4: Stop the dev server**

Run: `lsof -ti:3000 -sTCP:LISTEN | xargs -r kill`

- [x] **Step 5: Report findings**

If everything checks out, no further action — the feature is complete.
If the squeeze-zone or phone check reveals a problem (e.g., a label
collision `NARROW_CHART_BREAKPOINT` didn't fully cover), note the exact
viewport and symptom for a follow-up fix rather than guessing at one.
