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
