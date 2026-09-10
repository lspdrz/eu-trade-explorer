import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChartLegend } from "../ChartLegend";

describe("ChartLegend", () => {
  it("renders a swatch and name per item", () => {
    const html = renderToStaticMarkup(
      <ChartLegend
        items={[
          { key: "Ammonia", name: "Ammonia", color: "var(--color-series-1)" },
          { key: "Urea", name: "Urea", color: "var(--color-series-2)" },
        ]}
      />,
    );
    expect(html).toContain("Ammonia");
    expect(html).toContain("Urea");
    expect(html).toContain("var(--color-series-1)");
    expect(html).toContain("var(--color-series-2)");
    expect((html.match(/rounded-full/g) ?? []).length).toBe(2);
  });

  it("renders a single item (no legend-suppression for one series)", () => {
    const html = renderToStaticMarkup(
      <ChartLegend items={[{ key: "Ammonia", name: "Ammonia", color: "#111" }]} />,
    );
    expect(html).toContain("Ammonia");
    expect((html.match(/<li/g) ?? []).length).toBe(1);
  });
});
