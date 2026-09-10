import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { GroupedSeries } from "@/features/trade-data/types";
import { ImportsDataTable } from "@/features/trade-data/ui/components/ImportsDataTable";

const grid: GroupedSeries = {
  years: [2020, 2021],
  points: [
    { seriesKey: "US", year: 2020, tonnes: 100 },
    { seriesKey: "US", year: 2021, tonnes: 250 },
    { seriesKey: "EG", year: 2020, tonnes: 0 },
    { seriesKey: "EG", year: 2021, tonnes: 80 },
  ],
};
const seriesMeta = [
  { key: "US", name: "United States", color: "#111" },
  { key: "EG", name: "Egypt", color: "#222" },
];

describe("ImportsDataTable", () => {
  it("renders a row per series and a cell per year, with the given column label", () => {
    const html = renderToStaticMarkup(
      <ImportsDataTable series={grid} seriesMeta={seriesMeta} seriesLabel="Country" />,
    );
    expect(html).toContain("Show the numbers");
    expect((html.match(/<tr/g) ?? []).length).toBe(3); // header + 2 rows
    expect(html).toContain(">Country<");
    expect(html).toContain("by country"); // caption
    expect(html).toContain("United States");
    expect(html).toContain("250");
    expect(html).toContain("0"); // zero-filled cell
  });

  it("uses the label the caller passes", () => {
    const html = renderToStaticMarkup(
      <ImportsDataTable
        series={grid}
        seriesMeta={[{ key: "Ammonia", name: "Ammonia", color: "#111" }]}
        seriesLabel="Product"
      />,
    );
    expect(html).toContain(">Product<");
    expect(html).toContain("by product");
  });

  it("stars the partial year in the header", () => {
    const html = renderToStaticMarkup(
      <ImportsDataTable
        series={grid}
        seriesMeta={seriesMeta}
        seriesLabel="Country"
        partialYear={2021}
      />,
    );
    expect(html).toContain("2021*");
  });
});
