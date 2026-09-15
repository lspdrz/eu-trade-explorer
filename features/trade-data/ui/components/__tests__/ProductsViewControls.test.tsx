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
