import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const setSelection = vi.fn();
let selection = {
  source: "comext" as const,
  view: "countries" as const,
  partnerCodes: ["EG"],
  partner: "",
  products: ["Ammonia"],
  fromYear: undefined as number | undefined,
  toYear: undefined as number | undefined,
};

vi.mock("../../hooks/useChartSelection", () => ({
  useChartSelection: () => ({ selection, setSelection, isPending: false }),
}));

import { FertilizerImportsCountryView } from "../FertilizerImportsCountryView";

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

  it("renders the multi-select product picker, not the single-select listbox", () => {
    const html = renderToStaticMarkup(<FertilizerImportsCountryView {...props} />);
    expect(html).toContain("Products");
  });

  it("renders a stacked chart for the selection", () => {
    const html = renderToStaticMarkup(<FertilizerImportsCountryView {...props} />);
    expect(html).toContain("by partner country");
    expect(html).toContain("chart-bar");
  });

  it("shows the country empty state when no partner is selected", () => {
    selection = { ...selection, partnerCodes: [] };
    const html = renderToStaticMarkup(<FertilizerImportsCountryView {...props} />);
    expect(html).toContain("Choose up to three partner countries");
    expect(html).not.toContain("chart-bar");
  });
});
