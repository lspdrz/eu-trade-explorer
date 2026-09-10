import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { StackedSeries } from "../../../types";
import { StackedImportsDataTable } from "../StackedImportsDataTable";

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
      year: 2022,
      partnerCode: "EG",
      total: 30,
      segments: [
        { product: "Ammonia", tonnes: 30, y0: 0, y1: 30 },
        { product: "Urea", tonnes: 0, y0: 30, y1: 30 },
      ],
    },
    {
      year: 2021,
      partnerCode: "MA",
      total: 55,
      segments: [
        { product: "Ammonia", tonnes: 50, y0: 0, y1: 50 },
        { product: "Urea", tonnes: 5, y0: 50, y1: 55 },
      ],
    },
    {
      year: 2022,
      partnerCode: "MA",
      total: 12,
      segments: [
        { product: "Ammonia", tonnes: 8, y0: 0, y1: 8 },
        { product: "Urea", tonnes: 4, y0: 8, y1: 12 },
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
  nameForCountry: (c: string) => (c === "EG" ? "Egypt" : "Morocco"),
};

/** Each <tr> as an array of its cell texts, tags stripped. */
function tableRows(html: string): string[][] {
  return (html.match(/<tr[\s\S]*?<\/tr>/g) ?? []).map((tr) =>
    (tr.match(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g) ?? []).map((cell) =>
      cell.replace(/<[^>]+>/g, "").trim(),
    ),
  );
}

describe("StackedImportsDataTable", () => {
  it("lays out country, product and per-year columns in order", () => {
    const rows = tableRows(renderToStaticMarkup(<StackedImportsDataTable {...base} />));

    expect(rows[0]).toEqual(["Country", "Product", "2021", "2022"]);
    // EG: two product rows then a total row, then MA
    expect(rows[1]).toEqual(["Egypt", "Ammonia", "100", "30"]);
    expect(rows[2]).toEqual(["Egypt", "Urea", "40", "0"]);
    expect(rows[3]).toEqual(["Egypt", "Total", "140", "30"]);
    expect(rows[4]).toEqual(["Morocco", "Ammonia", "50", "8"]);
    expect(rows[5]).toEqual(["Morocco", "Urea", "5", "4"]);
    expect(rows[6]).toEqual(["Morocco", "Total", "55", "12"]);
  });

  it("puts the Total in the year columns as the column sum", () => {
    const rows = tableRows(renderToStaticMarkup(<StackedImportsDataTable {...base} />));
    const egTotal = rows.find((r) => r[0] === "Egypt" && r[1] === "Total")!;
    // 2021 col = 100 + 40, 2022 col = 30 + 0
    expect(egTotal.slice(2)).toEqual(["140", "30"]);
  });

  it("marks the partial year in the header column only", () => {
    const rows = tableRows(
      renderToStaticMarkup(<StackedImportsDataTable {...base} partialYear={2022} />),
    );
    expect(rows[0]).toEqual(["Country", "Product", "2021", "2022*"]);
    expect(rows[1]).toEqual(["Egypt", "Ammonia", "100", "30"]);
  });

  it("keeps the numbers behind the Show-the-numbers disclosure", () => {
    const html = renderToStaticMarkup(<StackedImportsDataTable {...base} />);
    expect(html).toContain("Show the numbers");
    expect(html).toMatch(/<details[\s\S]*<table/);
  });
});
