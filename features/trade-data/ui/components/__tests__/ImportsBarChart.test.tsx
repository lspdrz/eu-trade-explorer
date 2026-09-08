import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { GroupedSeries } from "../../../types";
import { ImportsBarChart } from "../ImportsBarChart";

const countries = [
  { code: "US", name: "United States", color: "#111" },
  { code: "EG", name: "Egypt", color: "#222" },
];

const series: GroupedSeries = {
  years: [2020, 2021, 2022],
  points: [
    { partnerCode: "US", year: 2020, tonnes: 100 },
    { partnerCode: "US", year: 2021, tonnes: 200 },
    { partnerCode: "US", year: 2022, tonnes: 50 },
    { partnerCode: "EG", year: 2020, tonnes: 0 },
    { partnerCode: "EG", year: 2021, tonnes: 80 },
    { partnerCode: "EG", year: 2022, tonnes: 40 },
  ],
};

function countBars(html: string): number {
  return (html.match(/class="[^"]*chart-bar/g) ?? []).length;
}

describe("ImportsBarChart", () => {
  it("shows the empty-state prompt and no bars when no countries are selected", () => {
    const html = renderToStaticMarkup(
      <ImportsBarChart series={{ years: [2020], points: [] }} countries={[]} width={800} />,
    );
    expect(html).toContain("Choose up to three partner countries");
    expect(countBars(html)).toBe(0);
  });

  it("renders one bar per (country, year)", () => {
    const html = renderToStaticMarkup(
      <ImportsBarChart series={series} countries={countries} width={800} />,
    );
    expect(countBars(html)).toBe(6);
  });

  it("marks partial-year bars", () => {
    const html = renderToStaticMarkup(
      <ImportsBarChart
        series={series}
        countries={countries}
        partialYear={2022}
        width={800}
      />,
    );
    expect((html.match(/data-partial="true"/g) ?? []).length).toBe(2);
  });

  it("renders the data table with a row per country and a cell per year", () => {
    const html = renderToStaticMarkup(
      <ImportsBarChart series={series} countries={countries} width={800} />,
    );
    expect(html).toContain("Show the numbers");
    expect((html.match(/<tr/g) ?? []).length).toBe(3); // header + 2 country rows
    expect(html).toContain("United States");
    expect(html).toContain("Egypt");
  });
});
