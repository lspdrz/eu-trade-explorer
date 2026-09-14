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

  it("flips the marker label to the left when it's too close to the right edge to fit", () => {
    const htmlAtEnd = renderToStaticMarkup(
      <RuTimelineChart
        years={years}
        series={twoSeries}
        highlightKey="fertiliser"
        markerYear={years[years.length - 1]}
        markerLabel="Russia invades Ukraine"
        width={720}
        height={360}
      />,
    );
    expect(htmlAtEnd).toMatch(/text-anchor="end"[^>]*>Russia invades Ukraine/);

    const htmlAtStart = renderToStaticMarkup(
      <RuTimelineChart
        years={years}
        series={twoSeries}
        highlightKey="fertiliser"
        markerYear={years[0]}
        markerLabel="Russia invades Ukraine"
        width={720}
        height={360}
      />,
    );
    expect(htmlAtStart).not.toContain('text-anchor="end"');
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

  it("dashes only the highlight line, so it's identifiable without an end-of-line label", () => {
    const html = renderToStaticMarkup(
      <RuTimelineChart years={years} series={fourSeries} highlightKey="fertiliser" width={720} height={360} />,
    );
    const dashedPaths = (html.match(/<path[^>]*stroke-dasharray="6 3"[^>]*>/g) ?? []).length;
    expect(dashedPaths).toBe(1);
    // No end-of-line labels at all anymore — the legend above the chart
    // (already asserted elsewhere) is the only place series are named.
    expect(html).not.toContain("Mineral fuels</text>");
  });

  it("dashes the highlight series' legend swatch to match its line", () => {
    const html = renderToStaticMarkup(
      <RuTimelineChart years={years} series={fourSeries} highlightKey="fertiliser" width={720} height={360} />,
    );
    // The legend swatch uses its own symmetric dash pattern (two equal
    // dashes centered around a fixed gap, sized to its own width) rather
    // than the chart line's literal HIGHLIGHT_DASH, so just assert some
    // dasharray is present on exactly one <line> (the marker's dashed
    // vertical line uses "4 4", a fixed unrelated pattern).
    const dashedLines = (html.match(/<line[^>]*stroke-dasharray="[^"]+"[^>]*>/g) ?? []).filter(
      (l) => !l.includes('stroke-dasharray="4 4"'),
    ).length;
    expect(dashedLines).toBe(1);
  });

  it("renders without touching browser globals during server render", () => {
    expect(() =>
      renderToStaticMarkup(
        <RuTimelineChart years={years} series={fourSeries} highlightKey="fertiliser" width={720} height={360} />,
      ),
    ).not.toThrow();
  });
});
