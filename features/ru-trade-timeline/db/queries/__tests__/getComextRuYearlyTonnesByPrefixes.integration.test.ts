import { describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { rawComextRuImports } from "@/lib/db/schemas/rawComextRuImports";
import { getComextRuYearlyTonnesByPrefixes } from "@/features/ru-trade-timeline/db/queries/getComextRuYearlyTonnesByPrefixes";

function row(o: Partial<typeof rawComextRuImports.$inferInsert>) {
  return {
    cn8ProductCode: "28141000",
    partnerCode: "RU",
    period: "2023-01",
    quantity100kg: "100",
    valueEuros: "200",
    syncedAt: new Date(),
    ...o,
  };
}

describe("getComextRuYearlyTonnesByPrefixes", () => {
  it("groups by year, summing quantity across every matching prefix", async () => {
    await db.insert(rawComextRuImports).values([
      row({ cn8ProductCode: "28141000", period: "2023-01", quantity100kg: "1000" }),
      row({ cn8ProductCode: "31021090", period: "2023-01", quantity100kg: "500" }),
      row({ cn8ProductCode: "31021090", period: "2024-01", quantity100kg: "300" }),
      row({ cn8ProductCode: "85423100", period: "2023-01", quantity100kg: "999999" }), // not requested
    ]);

    const result = await getComextRuYearlyTonnesByPrefixes(["2814", "3102"]);
    result.sort((a, b) => a.year - b.year);

    expect(result).toEqual([
      { year: 2023, quantity100kg: 1500 },
      { year: 2024, quantity100kg: 300 },
    ]);
  });

  it("returns [] for prefixes with no matching rows", async () => {
    expect(await getComextRuYearlyTonnesByPrefixes(["9999"])).toEqual([]);
  });
});
