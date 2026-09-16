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

  it("derives the slider's year bounds from the selected partner only, not the full dataset", () => {
    selection = { ...selection, partner: "MA" };
    const multiPartnerProps = {
      ...props,
      totalsByProduct: [
        {
          product: "Ammonia",
          totals: [
            { year: "2020", partnerCode: "EG", partner: "Egypt", tonnes: 90 },
            { year: "2021", partnerCode: "EG", partner: "Egypt", tonnes: 100 },
            { year: "2022", partnerCode: "EG", partner: "Egypt", tonnes: 110 },
            { year: "2023", partnerCode: "EG", partner: "Egypt", tonnes: 120 },
            { year: "2021", partnerCode: "MA", partner: "Morocco", tonnes: 50 },
            { year: "2022", partnerCode: "MA", partner: "Morocco", tonnes: 60 },
          ],
        },
      ],
    };
    const html = renderToStaticMarkup(<ProductsViewControls {...multiPartnerProps} />);
    expect(html).toContain("Years:");
    expect(html).toContain("2021");
    expect(html).toContain("2022");
    expect(html).not.toContain("2020");
    expect(html).not.toContain("2023");
  });

  it("hides the year range slider when no partner is selected, even if totalsByProduct has data", () => {
    selection = { ...selection, partner: "" };
    const html = renderToStaticMarkup(<ProductsViewControls {...props} />);
    expect(html).not.toContain("Years:");
  });
});
