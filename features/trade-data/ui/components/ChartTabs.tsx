"use client";

import { Tab, TabGroup, TabList } from "@headlessui/react";
import type { ChartView } from "../../types";

const VIEWS: ChartView[] = ["countries", "products"];
const LABEL: Record<ChartView, string> = {
  countries: "Compare countries",
  products: "Compare products",
};

/**
 * The two-tab strip above the chart. Controlled: `view` comes from the URL
 * selection, `onChange` navigates so the RSC refetches. `pending` dims it
 * during that round-trip.
 */
export function ChartTabs({
  view,
  onChange,
  pending = false,
}: {
  view: ChartView;
  onChange: (v: ChartView) => void;
  pending?: boolean;
}) {
  return (
    <TabGroup
      selectedIndex={VIEWS.indexOf(view)}
      onChange={(i) => onChange(VIEWS[i])}
    >
      <TabList
        className="flex gap-6 border-b border-border data-disabled:opacity-50"
        aria-busy={pending}
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
