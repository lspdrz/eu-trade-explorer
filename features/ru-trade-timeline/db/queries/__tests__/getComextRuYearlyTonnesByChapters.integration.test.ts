import { describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { rawComextRuImports } from "@/lib/db/schemas/rawComextRuImports";
import { getComextRuYearlyTonnesByChapters } from "@/features/ru-trade-timeline/db/queries/getComextRuYearlyTonnesByChapters";

function row(o: Partial<typeof rawComextRuImports.$inferInsert>) {
  return {
    cn8ProductCode: "27101100",
    partnerCode: "RU",
    period: "2023-01",
    quantity100kg: "100",
    valueEuros: "200",
    syncedAt: new Date(),
    ...o,
  };
}

describe("getComextRuYearlyTonnesByChapters", () => {
  it("groups by chapter and year, summing quantity", async () => {
    await db.insert(rawComextRuImports).values([
      row({ cn8ProductCode: "27101100", period: "2023-01", quantity100kg: "1000" }),
      row({ cn8ProductCode: "27101900", period: "2023-06", quantity100kg: "2000" }), // same chapter, same year
      row({ cn8ProductCode: "44011000", period: "2023-01", quantity100kg: "500" }), // different chapter
      row({ cn8ProductCode: "85423100", period: "2023-01", quantity100kg: "999999" }), // not requested
    ]);

    const result = await getComextRuYearlyTonnesByChapters(["27", "44"]);
    result.sort((a, b) => a.chapter.localeCompare(b.chapter) || a.year - b.year);

    expect(result).toEqual([
      { chapter: "27", year: 2023, quantity100kg: 3000 },
      { chapter: "44", year: 2023, quantity100kg: 500 },
    ]);
  });

  it("returns [] for chapters with no matching rows", async () => {
    expect(await getComextRuYearlyTonnesByChapters(["72"])).toEqual([]);
  });

  it("returns [] for an empty chapters list", async () => {
    expect(await getComextRuYearlyTonnesByChapters([])).toEqual([]);
  });
});
