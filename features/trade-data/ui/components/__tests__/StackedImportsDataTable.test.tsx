import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { StackedSeries } from "../../../types";
import { StackedImportsDataTable } from "../StackedImportsDataTable";

const series: StackedSeries = {
  years: [2021, 2022],
  partnerCodes: ["EG"],
  cells: [
    {
      year: 2021,
      partnerCode: "EG",
      total: 140,
      segments: [
        { product: "Ammonia", tonnes: 100, y0: 0, y1: 100 },
        { product: "Urea", tonnes: 40, y0: 100, y1: 140 },
      ],
    },
    {
      year: 2022,
      partnerCode: "EG",
      total: 30,
      segments: [
        { product: "Ammonia", tonnes: 30, y0: 0, y1: 30 },
        { product: "Urea", tonnes: 0, y0: 30, y1: 30 },
      ],
    },
  ],
};

const base = {
  series,
  seriesMeta: [
    { key: "Ammonia", name: "Ammonia", color: "#111" },
    { key: "Urea", name: "Urea", color: "#222" },
  ],
  nameForCountry: (c: string) => (c === "EG" ? "Egypt" : c),
};

describe("StackedImportsDataTable", () => {
  it("has a row per (country, product) plus a Total row", () => {
    const html = renderToStaticMarkup(<StackedImportsDataTable {...base} />);
    expect(html).toContain("Show the numbers");
    expect(html).toContain("Egypt");
    expect(html).toContain("Ammonia");
    expect(html).toContain("Urea");
    expect(html).toContain("Total");
  });

  it("shows per-year values and the column-sum total", () => {
    const html = renderToStaticMarkup(<StackedImportsDataTable {...base} />);
    expect(html).toContain("100");
    expect(html).toContain("40");
    expect(html).toContain("140"); // 2021 total
    expect(html).toContain("30"); // 2022 ammonia + total
  });

  it("marks the partial year in the header", () => {
    const html = renderToStaticMarkup(
      <StackedImportsDataTable {...base} partialYear={2022} />,
    );
    expect(html).toContain("2022*");
  });
});
