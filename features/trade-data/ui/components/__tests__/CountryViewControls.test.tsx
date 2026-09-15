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
