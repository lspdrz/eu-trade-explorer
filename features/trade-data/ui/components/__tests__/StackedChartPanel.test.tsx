import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { StackedSeriesPoint } from "../../../types";
import { StackedChartPanel } from "../StackedChartPanel";

const rows: StackedSeriesPoint[] = [
  { partnerCode: "EG", product: "Ammonia", year: 2021, tonnes: 100 },
  { partnerCode: "EG", product: "Urea", year: 2021, tonnes: 40 },
  { partnerCode: "MA", product: "Ammonia", year: 2021, tonnes: 60 },
];

const base = {
  rows,
  nameForCountry: (c: string) => (c === "EG" ? "Egypt" : "Morocco"),
  ariaLabel: (n: string) => `EU imports for ${n}, by partner country`,
  fromYear: 2021,
  toYear: 2021,
};

describe("StackedChartPanel", () => {
  it("prompts for a country when none is selected", () => {
    const html = renderToStaticMarkup(
      <StackedChartPanel {...base} partnerCodes={[]} products={["Ammonia"]} />,
    );
    expect(html).toContain("Choose up to three partner countries");
    expect(html).not.toContain("chart-bar");
  });

  it("prompts for a product when countries are set but products are empty", () => {
    const html = renderToStaticMarkup(
      <StackedChartPanel {...base} partnerCodes={["EG"]} products={[]} />,
    );
    expect(html).toContain("Choose one or more products");
    expect(html).not.toContain("chart-bar");
  });

  it("renders chart + table once both are selected", () => {
    const html = renderToStaticMarkup(
      <StackedChartPanel
        {...base}
        partnerCodes={["EG", "MA"]}
        products={["Ammonia", "Urea"]}
      />,
    );
    expect(html).toContain(
      'aria-label="EU imports for Ammonia, Urea, by partner country"',
    );
    expect(html).toContain("Show the numbers");
    expect(html).toContain("var(--color-series-1)");
    expect(html).toContain("var(--color-series-2)");
  });
});
