import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RuTimelineChart } from "@/features/ru-trade-timeline/ui/components/RuTimelineChart";

const years = [2020, 2021, 2022, 2023];
const twoSeries = [
  { key: "fertiliser", label: "Fertiliser", values: [100, 120, 90, 200], color: "var(--color-series-1)" },
  { key: "27", label: "Mineral fuels", values: [900, 800, 300, 250], color: "var(--color-series-2)" },
];
const fourSeries = [
  ...twoSeries,
  { key: "44", label: "Wood", values: [50, 60, 55, 40], color: "var(--color-series-3)" },
  { key: "72", label: "Iron and steel", values: [30, 35, 20, 25], color: "var(--color-series-4)" },
];

describe("RuTimelineChart", () => {
  it("renders one <path> per series plus the marker label", () => {
    const html = renderToStaticMarkup(
      <RuTimelineChart
        years={years}
        series={twoSeries}
        highlightKey="fertiliser"
        markerYear={2022}
        markerMonth={2}
        markerLabel="Russia invades Ukraine"
        width={720}
        height={360}
      />,
    );
    expect(html).toContain("<svg");
    expect((html.match(/<path/g) ?? []).length).toBe(2);
    expect(html).toContain("Russia invades Ukraine");
  });

  it("renders without a marker when markerYear is omitted", () => {
    const html = renderToStaticMarkup(
      <RuTimelineChart years={years} series={twoSeries} highlightKey="fertiliser" width={720} height={360} />,
    );
    expect(html).not.toContain("Russia invades Ukraine");
  });

  it("renders both series labels in the legend", () => {
    const html = renderToStaticMarkup(
      <RuTimelineChart years={years} series={twoSeries} highlightKey="fertiliser" width={720} height={360} />,
    );
    expect(html).toContain("Fertiliser");
    expect(html).toContain("Mineral fuels");
  });

  it("renders one <path> per series when there are more than 2", () => {
    const html = renderToStaticMarkup(
      <RuTimelineChart years={years} series={fourSeries} highlightKey="fertiliser" width={720} height={360} />,
    );
    expect((html.match(/<path/g) ?? []).length).toBe(4);
  });

  it("direct-labels at most 4 series", () => {
    const fiveSeries = [
      ...fourSeries,
      { key: "26", label: "Ores, slag and ash", values: [10, 12, 9, 11], color: "var(--color-series-5)" },
    ];
    const html = renderToStaticMarkup(
      <RuTimelineChart years={years} series={fiveSeries} highlightKey="fertiliser" width={720} height={360} />,
    );
    // Every series appears in the (comprehensive) legend regardless of
    // direct-label status, so scope the assertion to just the on-chart
    // direct-label <text> elements (class="fill-muted text-[10px]"),
    // distinct from the legend and the axis-tick text classes.
    const directLabels = [...html.matchAll(/text-\[10px\]">([^<]+)</g)].map((m) => m[1]);
    // fertiliser (highlight) + the 3 largest by final value: 27, 44, 72 — not 26
    expect(directLabels).toEqual(["Fertiliser", "Mineral fuels", "Wood", "Iron and steel"]);
  });

  it("renders without touching browser globals during server render", () => {
    expect(() =>
      renderToStaticMarkup(
        <RuTimelineChart years={years} series={fourSeries} highlightKey="fertiliser" width={720} height={360} />,
      ),
    ).not.toThrow();
  });
});
