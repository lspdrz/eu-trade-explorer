import { describe, expect, it } from "vitest";
import type { StackedSeriesPoint } from "../../../types";
import { selectStackedSeries } from "../selectStackedSeries";

const p = (o: Partial<StackedSeriesPoint>): StackedSeriesPoint => ({
  partnerCode: "EG",
  product: "Ammonia",
  year: 2021,
  tonnes: 0,
  ...o,
});

describe("selectStackedSeries", () => {
  it("builds a cell per (year, partner) with segments in products order, zero-filled", () => {
    const rows = [
      p({ partnerCode: "EG", product: "Ammonia", year: 2021, tonnes: 100 }),
      p({ partnerCode: "EG", product: "Urea", year: 2021, tonnes: 40 }),
      p({ partnerCode: "MA", product: "Ammonia", year: 2021, tonnes: 60 }),
    ];

    const result = selectStackedSeries(rows, {
      partnerCodes: ["EG", "MA"],
      products: ["Ammonia", "Urea"],
      fromYear: 2021,
      toYear: 2021,
    });

    expect(result.years).toEqual([2021]);
    expect(result.partnerCodes).toEqual(["EG", "MA"]);
    expect(result.cells).toEqual([
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
    ]);
  });

  it("zero-fills a missing year and ignores out-of-range rows", () => {
    const rows = [p({ year: 2020, tonnes: 999 }), p({ year: 2022, tonnes: 5 })];
    const result = selectStackedSeries(rows, {
      partnerCodes: ["EG"],
      products: ["Ammonia"],
      fromYear: 2021,
      toYear: 2022,
    });
    expect(result.cells.map((c) => c.total)).toEqual([0, 5]);
    expect(result.cells[0].year).toBe(2021);
  });

  it("keeps an unknown product as an all-zero segment", () => {
    const result = selectStackedSeries([p({ product: "Ammonia", tonnes: 10 })], {
      partnerCodes: ["EG"],
      products: ["Ammonia", "Nope"],
      fromYear: 2021,
      toYear: 2021,
    });
    expect(result.cells[0].segments).toEqual([
      { product: "Ammonia", tonnes: 10, y0: 0, y1: 10 },
      { product: "Nope", tonnes: 0, y0: 10, y1: 10 },
    ]);
  });

  it("returns no cells when no partners or no products are selected", () => {
    const rows = [p({ tonnes: 5 })];
    expect(
      selectStackedSeries(rows, {
        partnerCodes: [],
        products: ["Ammonia"],
        fromYear: 2021,
        toYear: 2021,
      }).cells,
    ).toEqual([]);
    expect(
      selectStackedSeries(rows, {
        partnerCodes: ["EG"],
        products: [],
        fromYear: 2021,
        toYear: 2021,
      }).cells,
    ).toEqual([]);
  });

  it("returns empty years and cells when the range is inverted", () => {
    const result = selectStackedSeries([], {
      partnerCodes: ["EG"],
      products: ["Ammonia"],
      fromYear: 2022,
      toYear: 2021,
    });
    expect(result).toEqual({ years: [], partnerCodes: ["EG"], cells: [] });
  });
});
