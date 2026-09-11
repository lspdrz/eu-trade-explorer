import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RuTimelineChart } from "@/features/ru-trade-timeline/ui/RuTimelineChart";

const years = [2020, 2021, 2022, 2023];
const series = [
  { key: "fertiliser", label: "Fertiliser", values: [100, 120, 90, 200] },
  { key: "rest", label: "Everything else", values: [900, 800, 300, 250] },
];

describe("RuTimelineChart", () => {
  it("renders one <path> per series plus the marker label", () => {
    const html = renderToStaticMarkup(
      <RuTimelineChart
        years={years}
        series={series}
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
      <RuTimelineChart years={years} series={series} highlightKey="fertiliser" width={720} height={360} />,
    );
    expect(html).not.toContain("Russia invades Ukraine");
  });

  it("renders both series labels in the legend", () => {
    const html = renderToStaticMarkup(
      <RuTimelineChart years={years} series={series} highlightKey="fertiliser" width={720} height={360} />,
    );
    expect(html).toContain("Fertiliser");
    expect(html).toContain("Everything else");
  });

  it("renders without touching browser globals during server render", () => {
    expect(() =>
      renderToStaticMarkup(
        <RuTimelineChart years={years} series={series} highlightKey="fertiliser" width={720} height={360} />,
      ),
    ).not.toThrow();
  });
});
