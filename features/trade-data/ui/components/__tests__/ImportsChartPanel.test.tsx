import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { GroupedSeriesPoint } from "@/features/trade-data/types";
import { ImportsChartPanel } from "@/features/trade-data/ui/components/ImportsChartPanel";

const rows: GroupedSeriesPoint[] = [
  { seriesKey: "RU", year: 2021, tonnes: 100 },
  { seriesKey: "EG", year: 2021, tonnes: 50 },
];

const base = {
  rows,
  nameFor: (k: string) => (k === "RU" ? "Russia" : "Egypt"),
  seriesLabel: "Country",
  colorMax: 3,
  ariaLabel: (names: string) => `EU imports for ${names}`,
  emptyMessage: "Pick a country.",
  fromYear: 2021,
  toYear: 2021,
};

describe("ImportsChartPanel", () => {
  it("shows the empty message and no chart when nothing is selected", () => {
    const html = renderToStaticMarkup(
      <ImportsChartPanel {...base} seriesKeys={[]} />,
    );
    expect(html).toContain("Pick a country.");
    expect(html).not.toContain("chart-bar");
    expect(html).not.toContain("Show the numbers");
  });

  it("renders the chart + data table with the given labels once series are selected", () => {
    const html = renderToStaticMarkup(
      <ImportsChartPanel {...base} seriesKeys={["RU", "EG"]} />,
    );
    expect((html.match(/class="[^"]*chart-bar/g) ?? []).length).toBe(2);
    expect(html).toContain("aria-label=\"EU imports for Russia, Egypt\"");
    expect(html).toContain(">Country<");
    expect(html).toContain("Show the numbers");
  });

  it("assigns a distinct colour per series, up to colorMax", () => {
    const html = renderToStaticMarkup(
      <ImportsChartPanel {...base} seriesKeys={["RU", "EG"]} />,
    );
    expect(html).toContain("var(--color-series-1)");
    expect(html).toContain("var(--color-series-2)");
  });
});
