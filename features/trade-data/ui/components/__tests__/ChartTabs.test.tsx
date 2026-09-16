import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ChartSelection } from "@/features/trade-data/types";

const setSelection = vi.fn();
let selection: ChartSelection = {
  view: "countries",
  partnerCodes: ["RU"],
  partner: "RU",
  products: ["Ammonia"],
  fromYear: undefined,
  toYear: undefined,
};

vi.mock("@/features/trade-data/ui/hooks/useChartSelection", () => ({
  useChartSelection: () => ({ selection, setSelection, isPending: false }),
}));

import { ChartTabs } from "@/features/trade-data/ui/components/ChartTabs";

describe("ChartTabs", () => {
  it("renders both tab labels", () => {
    selection = { ...selection, view: "countries" };
    const html = renderToStaticMarkup(<ChartTabs />);
    expect(html).toContain("Compare countries");
    expect(html).toContain("Compare products");
  });

  it("marks the tab named by the selection's view as active", () => {
    selection = { ...selection, view: "countries" };
    const countries = renderToStaticMarkup(<ChartTabs />);
    selection = { ...selection, view: "products" };
    const products = renderToStaticMarkup(<ChartTabs />);

    expect(countries).not.toBe(products);
    expect(countries).toMatch(
      /Compare countries[\s\S]{0,200}(data-selected|aria-selected="true")|(data-selected|aria-selected="true")[\s\S]{0,200}Compare countries/,
    );
    expect(products).toMatch(
      /Compare products[\s\S]{0,200}(data-selected|aria-selected="true")|(data-selected|aria-selected="true")[\s\S]{0,200}Compare products/,
    );
  });
});
