import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

let search = "";
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(search),
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn() }),
}));

import { ChartTabs } from "../ChartTabs";

describe("ChartTabs", () => {
  it("renders both tab labels", () => {
    search = "";
    const html = renderToStaticMarkup(<ChartTabs />);
    expect(html).toContain("Compare countries");
    expect(html).toContain("Compare products");
  });

  it("marks the tab named by ?view= as active", () => {
    search = "";
    const countries = renderToStaticMarkup(<ChartTabs />);
    search = "view=products";
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
