import { describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { rawComextRuImports } from "@/lib/db/schemas/rawComextRuImports";
import { getAllComextRuRows } from "@/features/ru-trade-timeline/db/queries/getAllComextRuRows";

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

describe("getAllComextRuRows", () => {
  it("returns every row, quantity as a number", async () => {
    await db.insert(rawComextRuImports).values([
      row({ cn8ProductCode: "28141000", period: "2023-01", quantity100kg: "1500" }),
      row({ cn8ProductCode: "85423100", period: "2023-02", quantity100kg: "2500" }),
    ]);

    const result = await getAllComextRuRows();
    result.sort((a, b) => a.period.localeCompare(b.period));

    expect(result).toEqual([
      { cn8ProductCode: "28141000", period: "2023-01", quantity100kg: 1500 },
      { cn8ProductCode: "85423100", period: "2023-02", quantity100kg: 2500 },
    ]);
  });

  it("maps a NULL quantity to 0", async () => {
    await db.insert(rawComextRuImports).values([
      row({ cn8ProductCode: "28141000", period: "2023-03", quantity100kg: null }),
    ]);

    expect(await getAllComextRuRows()).toEqual([
      { cn8ProductCode: "28141000", period: "2023-03", quantity100kg: 0 },
    ]);
  });

  it("returns [] when the table is empty", async () => {
    expect(await getAllComextRuRows()).toEqual([]);
  });
});
