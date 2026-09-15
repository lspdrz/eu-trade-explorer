# Imports page: move controls into the sidebar

## Context

The Imports page (`/`, `features/trade-data`) stacks its controls row
(product picker, country picker, year-range slider) directly above the
chart, inside whichever tab (`FertilizerImportsCountryView` /
`FertilizerImportsProductsView`) is active. On a wide-but-short viewport —
a 13" MacBook is the concrete target — that stack (nav + page header +
tabs + controls row + chart) is taller than the viewport, forcing a
scroll to see the chart. The `/globe` page had the same shape of problem
(see `features/globe/lib/globeSize.ts` and the `centered globe` commit)
but a different fix, since its content is one fixed-aspect canvas rather
than a chart plus a row of pickers.

The page already has a sidebar column (`EventsPanel`) that sits beside
the main content at `lg:` (1024px) and stacks below it under that. The
sidebar has spare vertical room next to the chart on wide screens. Moving
the controls row into that column, above `EventsPanel`, removes an entire
row's height from the main column's vertical stack.

## Goals

- On a 13" MacBook (and wider), the chart is visible without scrolling.
- The tab switcher (`ChartTabs`, "Compare countries" / "Compare
  products") and the controls row both sit in the sidebar, above
  `EventsPanel` — the main column holds only the chart.
- The sidebar (tabs + controls + `EventsPanel`) sits beside the chart
  starting at `md:` (~768px), not just `lg:` — tablets get the
  side-by-side layout too, not only laptop-or-wider.
- Below `md:` (phones), the chart still renders before the tabs and
  controls in visual order (today's `flex-col-reverse` trick achieves
  this for the controls-vs-chart order within one column; the redesign
  achieves the same order for free, via the grid's natural stacking,
  once tabs and controls are no longer inside the main column at all).
- The chart stays legible in the tighter column width that results from
  the sidebar now appearing as early as `md:`.

## Non-goals

- Changing the globe page, or any layout beyond `/`.
- Making the chart's fixed height (`DEFAULT_HEIGHT = 420`) responsive to
  viewport height. Relocating the controls row is expected to be enough
  for the 13" target; if it isn't, that's a follow-up, not part of this
  change.
- Pixel-exact chart-width-driven year-span capping (see "Chart squeeze
  zone" below) — a viewport-width heuristic is enough here, consistent
  with how the existing mobile cap already works.

## Current structure (for reference)

`features/trade-data/ui/index.tsx` (RSC) renders:

```
<main>
  <header>...</header>
  <div class="grid lg:grid-cols-[1fr_17rem] lg:items-start">
    <div class="min-w-0">
      <ChartTabs />
      {tab}                 <!-- FertilizerImportsCountryView | FertilizerImportsProductsView -->
    </div>
    <EventsPanel />
  </div>
</main>
```

Each tab component (`FertilizerImportsCountryView.tsx`,
`FertilizerImportsProductsView.tsx`) is a client component that:
1. Calls `useChartSelection()` for the URL-backed selection.
2. Derives `years` / `fromYear` / `toYear` / `partialYear` from its
   fetched totals via `deriveBounds` / `deriveYearRange`
   (`lib/chartSelectionParams.ts`) — both pure, isomorphic functions.
3. Renders a `flex flex-col-reverse md:flex-col` wrapper containing the
   controls row, then the chart panel (`StackedChartPanel` /
   `ImportsChartPanel`).

`useChartSelection()` reads/writes the URL directly
(`useSearchParams`/`usePathname`/`router.push`), so any component that
calls it independently stays in sync with every other one — this is
already how `ChartTabs` coordinates with the tab views without any
shared parent state. `ChartTabs` itself takes no props at all — it's
fully self-contained, which is what makes relocating it into the
sidebar (below) a pure move, no prop plumbing required.

## Design

### 1. Breakpoint

In `index.tsx`, change the grid from `lg:grid-cols-[1fr_17rem]
lg:items-start` to `md:grid-cols-[1fr_17rem] md:items-start`.

Below `md:`, the grid falls back to its implicit single column, so the
main column (chart) and the sidebar (tabs + controls + `EventsPanel`)
stack in DOM order: chart first, tabs + controls + events below. That's
already the desired mobile order, so the `flex-col-reverse` wrapper in
both tab components is deleted — it existed only to fake this order
within one column, and is redundant once tabs and controls physically
move to a different grid item.

### 2. Split controls out of each tab, and move `ChartTabs` into the sidebar

New components, one per tab, each a client component:

- `features/trade-data/ui/components/CountryViewControls.tsx` — the
  `ProductMultiSelect` + `CountryCombobox` + `YearRangeSlider` row
  currently inside `FertilizerImportsCountryView`.
- `features/trade-data/ui/components/ProductsViewControls.tsx` — same
  for `FertilizerImportsProductsView` (`CountryCombobox` single-partner
  + `ProductMultiSelect` + `YearRangeSlider`).

Each Controls component:
- Takes the same props its old host already receives from the RSC
  (`availableProducts`, `availablePartners`, and the totals needed to
  derive `years` — `totalsByCountry` / `totalsByProduct`).
- Calls `useChartSelection()` itself (no prop drilling of `selection` /
  `setSelection` from a parent).
- Derives `years` via `deriveBounds` the same way its old host did, and
  `maxYearSpan` via the widened `useIsMobile` check (see below) — both
  duplicated from, not shared with, the trimmed-down view component,
  since both need the identical pure derivation from the identical
  props and there's no parent in common closer than the RSC.

`FertilizerImportsCountryView.tsx` / `FertilizerImportsProductsView.tsx`
shrink to just the chart panel: `useChartSelection()` for `selection`,
the same `years`/`fromYear`/`toYear`/`partialYear` derivation (still
needed here too, to filter the series and pass `partialYear` down), and
the `StackedChartPanel` / `ImportsChartPanel` render. Their exported
prop types don't change.

`ChartTabs` itself doesn't change at all — only where `index.tsx`
places it moves, from the top of the main column to the top of the
sidebar.

`index.tsx` renders:

```
<div class="grid md:grid-cols-[1fr_17rem] md:items-start">
  <div class="min-w-0">
    {chartView}       <!-- trimmed FertilizerImportsCountryView | FertilizerImportsProductsView -->
  </div>
  <div>
    <ChartTabs />
    {controlsView}     <!-- CountryViewControls | ProductsViewControls -->
    <EventsPanel />
  </div>
</div>
```

selected by the same `view === "countries"` branch that already picks
`tab` today, now producing two nodes (`controlsView`, `chartView`)
instead of one.

### 3. Chart squeeze zone

`MAX_YEAR_SPAN_MOBILE` (7) caps the shown year span so the per-bar
partner-country-code label can't collide with its neighbors. It's
gated today on `useIsMobile()`'s default `<640px` check, run inside
`FertilizerImportsCountryView` (only the countries tab uses it — the
products tab has one bar per year, no per-bar collision risk, so it
doesn't pass `maxYearSpan` at all).

Once the sidebar can appear as early as `md:` (768px), the main
column's width briefly drops (viewport 768px → column width roughly
768 − 48 padding − 32 gap − 272 sidebar ≈ 416px) before growing
comfortable again as the viewport keeps widening past `md:`. The
`<640px` check misses this squeeze range entirely.

Fix: widen the breakpoint passed to `useIsMobile` for this specific
check — e.g. `useIsMobile(1024)` in place of `useIsMobile()` — so the
leaner year span applies through the whole `md`–`lg` squeeze range, not
just true phone widths. This moves with the new Controls component
(since `years`/`maxYearSpan`/`fromYear`/`toYear` are now derived there,
per point 2 above) and stays a viewport-width heuristic, matching how
the mechanism already works — not a measured-chart-width fix (see
Non-goals). The bar chart itself needs no changes: `StackedImportsChart`
/ `ImportsBarChart` already measure their own container width
(`useMeasuredWidth`) and reflow the band scales and year-axis label
thinning (`xAxisLabelStep`) accordingly.

## Testing impact

- `FertilizerImportsCountryView.test.tsx` / a not-yet-existing
  `FertilizerImportsProductsView.test.tsx`-equivalent currently assert
  on both the controls row and the chart in one render (e.g. "renders
  the multi-select product picker" + "renders a stacked chart"). These
  split along with the components: the controls assertions move to new
  `CountryViewControls.test.tsx` / `ProductsViewControls.test.tsx`, and
  the view tests keep only the chart/empty-state assertions.
- New tests for the widened `useIsMobile` breakpoint's effect on
  `maxYearSpan` inside the Controls component (or, if simpler to keep
  pure-function-testable, a small extraction mirroring how
  `clampToMaxSpan` in `YearRangeSlider.tsx` is already pulled out as a
  standalone testable function).
- No integration tests are affected (this is UI/layout only, no query
  or mutation changes).

## Risks / tradeoffs

- Duplicating the `years`/`maxYearSpan`/`fromYear`/`toYear` derivation
  across the new Controls component and the trimmed view component is
  minor recomputation (cheap pure functions over already-fetched data),
  not a correctness risk — both derive from the same props and the same
  URL-backed selection, so they can't drift.
- The `md`–`lg` squeeze range's year-span cap is a heuristic, not exact;
  an unusual zoom level or OS font-scaling could still show a tight fit
  in that range. Out of scope to solve precisely here (see Non-goals).
- On phones (below `md:`), the tab switcher now renders below the chart
  instead of above it — a visitor sees a chart before they see which
  comparison it's showing, or how to switch it. This is the direct,
  accepted consequence of the explicit ask to move `ChartTabs` into the
  sidebar unconditionally, rather than only at `md:`+.
