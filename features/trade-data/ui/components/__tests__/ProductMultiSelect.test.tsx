import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProductMultiSelect } from "@/features/trade-data/ui/components/ProductMultiSelect";

const products = ["Ammonia", "Nitrogenous fertilisers", "Urea"];

describe("ProductMultiSelect", () => {
  it("shows the selected products joined", () => {
    const html = renderToStaticMarkup(
      <ProductMultiSelect
        products={products}
        value={["Ammonia", "Urea"]}
        onChange={() => {}}
        max={3}
      />,
    );
    expect(html).toContain("Ammonia, Urea");
  });

  it("prompts when nothing is selected", () => {
    const html = renderToStaticMarkup(
      <ProductMultiSelect products={products} value={[]} onChange={() => {}} max={3} />,
    );
    expect(html).toContain("Choose products");
  });

  it("collapses a long selection to a count", () => {
    const html = renderToStaticMarkup(
      <ProductMultiSelect
        products={products}
        value={["Ammonia", "Nitrogenous fertilisers", "Urea"]}
        onChange={() => {}}
        max={3}
      />,
    );
    expect(html).toContain("3 products");
  });

  // The options live in a headless-ui popover that only mounts when open, so
  // renderToStaticMarkup can't see them — the button label is what's testable
  // here.
});
