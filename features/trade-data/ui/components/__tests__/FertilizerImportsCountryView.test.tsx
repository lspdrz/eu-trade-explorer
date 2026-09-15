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
