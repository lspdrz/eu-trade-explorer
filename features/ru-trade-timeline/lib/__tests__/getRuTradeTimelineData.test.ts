import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/ru-trade-timeline/db/queries/getComextRuYearlyTonnesByChapters", () => ({
  getComextRuYearlyTonnesByChapters: vi.fn(),
}));
vi.mock("@/features/ru-trade-timeline/db/queries/getComextRuYearlyTonnesByPrefixes", () => ({
  getComextRuYearlyTonnesByPrefixes: vi.fn(),
}));

import { getComextRuYearlyTonnesByChapters } from "@/features/ru-trade-timeline/db/queries/getComextRuYearlyTonnesByChapters";
import { getComextRuYearlyTonnesByPrefixes } from "@/features/ru-trade-timeline/db/queries/getComextRuYearlyTonnesByPrefixes";
import { getRuTradeTimelineData, YEARS } from "@/features/ru-trade-timeline/lib/getRuTradeTimelineData";
import { DEFAULT_COMPARISON_CHAPTERS } from "@/features/ru-trade-timeline/constants/defaultComparisonChapters";

describe("getRuTradeTimelineData", () => {
  it("queries fertiliser's prefixes and the default chapters", async () => {
    vi.mocked(getComextRuYearlyTonnesByPrefixes).mockResolvedValue([]);
    vi.mocked(getComextRuYearlyTonnesByChapters).mockResolvedValue([]);

    await getRuTradeTimelineData();

    expect(getComextRuYearlyTonnesByPrefixes).toHaveBeenCalledWith(["2814", "3102"]);
    expect(getComextRuYearlyTonnesByChapters).toHaveBeenCalledWith(DEFAULT_COMPARISON_CHAPTERS);
  });

  it("returns fertiliser first, then the 4 default chapters, aligned to YEARS", async () => {
    vi.mocked(getComextRuYearlyTonnesByPrefixes).mockResolvedValue([
      { year: 2023, quantity100kg: 1000 },
    ]);
    vi.mocked(getComextRuYearlyTonnesByChapters).mockResolvedValue([
      { chapter: "44", year: 2023, quantity100kg: 2000 },
    ]);

    const data = await getRuTradeTimelineData();

    expect(data.years).toEqual(YEARS);
    expect(data.series).toHaveLength(1 + DEFAULT_COMPARISON_CHAPTERS.length);
    expect(data.series[0].key).toBe("fertiliser");
    expect(data.series.slice(1).map((s) => s.key)).toEqual(DEFAULT_COMPARISON_CHAPTERS);

    const year2023Index = YEARS.indexOf(2023);
    expect(data.series[0].values[year2023Index]).toBe(100); // 1000/10
    expect(data.series.find((s) => s.key === "44")!.values[year2023Index]).toBe(200); // 2000/10
  });

  it("zero-fills a chapter with no rows in the query result", async () => {
    vi.mocked(getComextRuYearlyTonnesByPrefixes).mockResolvedValue([]);
    vi.mocked(getComextRuYearlyTonnesByChapters).mockResolvedValue([]);

    const data = await getRuTradeTimelineData();

    expect(data.series.every((s) => s.values.every((v) => v === 0))).toBe(true);
  });
});
