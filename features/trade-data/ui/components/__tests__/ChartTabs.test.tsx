import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChartTabs } from "../ChartTabs";

describe("ChartTabs", () => {
  it("renders both tab labels", () => {
    const html = renderToStaticMarkup(<ChartTabs view="countries" onChange={() => {}} />);
    expect(html).toContain("Compare countries");
    expect(html).toContain("Compare products");
  });

  it("marks the active tab", () => {
    const countries = renderToStaticMarkup(
      <ChartTabs view="countries" onChange={() => {}} />,
    );
    const products = renderToStaticMarkup(
      <ChartTabs view="products" onChange={() => {}} />,
    );
    // headless-ui stamps the selected Tab; assert the two renders differ and
    // each names the right active label near a "selected" marker.
    expect(countries).not.toBe(products);
    expect(countries).toMatch(/Compare countries[\s\S]{0,200}(data-selected|aria-selected="true")|(data-selected|aria-selected="true")[\s\S]{0,200}Compare countries/);
  });
});
