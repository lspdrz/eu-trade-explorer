"use client";

import { Tab, TabGroup, TabList } from "@headlessui/react";
import type { ChartView } from "../../types";
import { useChartSelection } from "../hooks/useChartSelection";
import { PIVOT_CLEARED } from "../utils/chartSelectionParams";

const VIEWS: ChartView[] = ["countries", "products"];
const LABEL: Record<ChartView, string> = {
  countries: "Compare countries",
  products: "Compare products",
};

/**
 * The two-tab strip. Self-wired to `?view=` — the active tab is page
 * navigation, shared above both chart views, so it owns its own URL state.
 * Switching tabs is a pivot: it clears the product / partner / year
 * selection (each tab starts fresh) but keeps the source. `isPending` dims
 * it during the RSC refetch a switch triggers.
 */
export function ChartTabs() {
  const { selection, setSelection, isPending } = useChartSelection();

  return (
    <TabGroup
      selectedIndex={VIEWS.indexOf(selection.view)}
      onChange={(i) => setSelection({ ...PIVOT_CLEARED, view: VIEWS[i] })}
    >
      <TabList
        className="flex gap-6 border-b border-border data-disabled:opacity-50"
        aria-busy={isPending}
      >
        {VIEWS.map((v) => (
          <Tab
            key={v}
            className="-mb-px border-b-2 border-transparent pb-2 text-sm font-medium text-muted data-selected:border-foreground data-selected:text-foreground focus-visible:outline-none"
          >
            {LABEL[v]}
          </Tab>
        ))}
      </TabList>
    </TabGroup>
  );
}
