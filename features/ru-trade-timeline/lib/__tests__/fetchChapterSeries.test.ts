import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/ru-trade-timeline/db/queries/getComextRuYearlyTonnesByChapters", () => ({
  getComextRuYearlyTonnesByChapters: vi.fn(),
}));

import { getComextRuYearlyTonnesByChapters } from "@/features/ru-trade-timeline/db/queries/getComextRuYearlyTonnesByChapters";
import { fetchChapterSeries } from "@/features/ru-trade-timeline/lib/fetchChapterSeries";

// Matches fetchChapterSeries.ts's own (unexported — a "use server" file may
// only export async functions) YEARS range.
const YEARS = Array.from({ length: 2025 - 2010 + 1 }, (_, i) => 2010 + i);

describe("fetchChapterSeries", () => {
  it("queries the single chapter and returns one series aligned to YEARS", async () => {
    vi.mocked(getComextRuYearlyTonnesByChapters).mockResolvedValue([
      { chapter: "72", year: 2020, quantity100kg: 5000 },
    ]);

    const series = await fetchChapterSeries("72");

    expect(getComextRuYearlyTonnesByChapters).toHaveBeenCalledWith(["72"]);
    expect(series.key).toBe("72");
    expect(series.label).toBe("Iron and steel");
    expect(series.values).toHaveLength(YEARS.length);
    expect(series.values[YEARS.indexOf(2020)]).toBe(500); // 5000/10
  });

  it("returns an all-zero series when the query returns no rows", async () => {
    vi.mocked(getComextRuYearlyTonnesByChapters).mockResolvedValue([]);
    const series = await fetchChapterSeries("50");
    expect(series.values.every((v) => v === 0)).toBe(true);
  });

  it("falls back to the chapter code as the label when it's unknown", async () => {
    vi.mocked(getComextRuYearlyTonnesByChapters).mockResolvedValue([]);
    const series = await fetchChapterSeries("00");
    expect(series.label).toBe("00");
  });

  it("does not blend another chapter's rows into the returned series", async () => {
    // Simulates the query returning more than the requested chapter (it
    // shouldn't in practice, but this function must not trust that blindly).
    vi.mocked(getComextRuYearlyTonnesByChapters).mockResolvedValue([
      { chapter: "72", year: 2020, quantity100kg: 5000 },
      { chapter: "44", year: 2020, quantity100kg: 999_999 }, // different chapter
    ]);

    const series = await fetchChapterSeries("72");

    expect(series.key).toBe("72");
    expect(series.values[YEARS.indexOf(2020)]).toBe(500); // only 72's 5000/10 — not 44's row
  });
});
