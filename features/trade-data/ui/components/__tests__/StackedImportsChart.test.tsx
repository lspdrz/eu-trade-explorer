import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { StackedSeries } from "../../../types";
import { StackedImportsChart } from "../StackedImportsChart";

const seriesMeta = [
  { key: "Ammonia", name: "Ammonia", color: "#111" },
  { key: "Urea", name: "Urea", color: "#222" },
];

const series: StackedSeries = {
  years: [2021, 2022],
  partnerCodes: ["EG", "MA"],
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
      year: 2021,
      partnerCode: "MA",
      total: 60,
      segments: [
        { product: "Ammonia", tonnes: 60, y0: 0, y1: 60 },
        { product: "Urea", tonnes: 0, y0: 60, y1: 60 },
      ],
    },
    {
      year: 2022,
      partnerCode: "EG",
      total: 50,
      segments: [
        { product: "Ammonia", tonnes: 50, y0: 0, y1: 50 },
        { product: "Urea", tonnes: 0, y0: 50, y1: 50 },
      ],
    },
    {
      year: 2022,
      partnerCode: "MA",
      total: 20,
      segments: [
        { product: "Ammonia", tonnes: 20, y0: 0, y1: 20 },
        { product: "Urea", tonnes: 0, y0: 20, y1: 20 },
      ],
    },
  ],
};

const base = {
  series,
  seriesMeta,
  nameForCountry: (c: string) => (c === "EG" ? "Egypt" : "Morocco"),
  ariaLabel: "EU imports for Ammonia, Urea, by partner country",
  width: 800,
};

const bars = (html: string) =>
  (html.match(/class="[^"]*chart-bar/g) ?? []).length;

describe("StackedImportsChart", () => {
  it("renders one rect per non-zero segment", () => {
    // EG2021: 2 non-zero, MA2021: 1, EG2022: 1, MA2022: 1 => 5
    expect(bars(renderToStaticMarkup(<StackedImportsChart {...base} />))).toBe(5);
  });

  it("tags each segment with product, partner and year", () => {
    const html = renderToStaticMarkup(<StackedImportsChart {...base} />);
    expect(html).toContain('data-series="Ammonia"');
    expect(html).toContain('data-series="Urea"');
    expect(html).toContain('data-partner="EG"');
    expect(html).toContain('data-partner="MA"');
    expect(html).toContain('data-year="2022"');
  });

  it("shows a country code under every bar, in every year group", () => {
    const html = renderToStaticMarkup(<StackedImportsChart {...base} />);
    expect((html.match(/>EG</g) ?? []).length).toBe(2);
    expect((html.match(/>MA</g) ?? []).length).toBe(2);
  });

  it("renders a product legend", () => {
    const html = renderToStaticMarkup(<StackedImportsChart {...base} />);
    expect(html).toContain("Ammonia");
    expect(html).toContain("Urea");
  });

  it("marks partial-year segments", () => {
    const html = renderToStaticMarkup(
      <StackedImportsChart {...base} partialYear={2022} />,
    );
    expect((html.match(/data-partial="true"/g) ?? []).length).toBe(2);
  });

  it("puts the given aria-label on the svg", () => {
    const html = renderToStaticMarkup(<StackedImportsChart {...base} />);
    expect(html).toContain(
      'aria-label="EU imports for Ammonia, Urea, by partner country"',
    );
  });
});
