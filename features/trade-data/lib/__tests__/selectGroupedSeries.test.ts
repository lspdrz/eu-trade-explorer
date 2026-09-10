import { describe, expect, it } from "vitest";
import type { GroupedSeriesPoint } from "@/features/trade-data/types";
import { selectGroupedSeries } from "@/features/trade-data/lib/selectGroupedSeries";

const r = (o: Partial<GroupedSeriesPoint>): GroupedSeriesPoint => ({
  seriesKey: "US",
  year: 2020,
  tonnes: 0,
  ...o,
});

describe("selectGroupedSeries", () => {
  it("builds the full seriesKey x year grid in selection order, zero-filling gaps", () => {
    const rows = [
      r({ seriesKey: "US", year: 2020, tonnes: 100 }),
      r({ seriesKey: "US", year: 2021, tonnes: 150 }),
      r({ seriesKey: "EG", year: 2021, tonnes: 80 }),
    ];

    const result = selectGroupedSeries(rows, {
      seriesKeys: ["US", "EG"],
      fromYear: 2020,
      toYear: 2021,
    });

    expect(result.years).toEqual([2020, 2021]);
    expect(result.points).toEqual([
      { seriesKey: "US", year: 2020, tonnes: 100 },
      { seriesKey: "US", year: 2021, tonnes: 150 },
      { seriesKey: "EG", year: 2020, tonnes: 0 },
      { seriesKey: "EG", year: 2021, tonnes: 80 },
    ]);
  });

  it("excludes years outside the range and keys not selected", () => {
    const rows = [
      r({ seriesKey: "US", year: 2019, tonnes: 999 }),
      r({ seriesKey: "US", year: 2020, tonnes: 10 }),
      r({ seriesKey: "RU", year: 2020, tonnes: 500 }),
    ];

    const result = selectGroupedSeries(rows, {
      seriesKeys: ["US"],
      fromYear: 2020,
      toYear: 2020,
    });

    expect(result.points).toEqual([{ seriesKey: "US", year: 2020, tonnes: 10 }]);
  });

  it("returns empty points when no keys are selected", () => {
    const result = selectGroupedSeries([r({ tonnes: 5 })], {
      seriesKeys: [],
      fromYear: 2020,
      toYear: 2022,
    });
    expect(result).toEqual({ years: [2020, 2021, 2022], points: [] });
  });

  it("returns empty years when the range is inverted", () => {
    const result = selectGroupedSeries([], {
      seriesKeys: ["US"],
      fromYear: 2022,
      toYear: 2020,
    });
    expect(result).toEqual({ years: [], points: [] });
  });

  it("works with product keys the same way", () => {
    const rows = [
      r({ seriesKey: "Ammonia", year: 2021, tonnes: 5 }),
      r({ seriesKey: "Urea", year: 2021, tonnes: 9 }),
    ];

    const result = selectGroupedSeries(rows, {
      seriesKeys: ["Ammonia", "Urea"],
      fromYear: 2021,
      toYear: 2021,
    });

    expect(result.points).toEqual([
      { seriesKey: "Ammonia", year: 2021, tonnes: 5 },
      { seriesKey: "Urea", year: 2021, tonnes: 9 },
    ]);
  });
});
