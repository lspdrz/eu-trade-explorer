import { describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { rawComextImports } from "@/lib/db/schemas/rawComextImports";
import { getComextRowsByHeading } from "../getComextRowsByHeading";

function row(o: Partial<typeof rawComextImports.$inferInsert>) {
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

describe("getComextRowsByHeading", () => {
  it("returns only rows whose CN8 code starts with the heading, quantity as a number", async () => {
    await db.insert(rawComextImports).values([
      row({ cn8ProductCode: "28141000", period: "2023-01", quantity100kg: "1500" }),
      row({ cn8ProductCode: "28142000", period: "2023-02", quantity100kg: "2500" }),
      row({ cn8ProductCode: "31021090", period: "2023-01", quantity100kg: "9999" }), // 3102 — excluded
    ]);

    const result = await getComextRowsByHeading("2814");
    result.sort((a, b) => a.period.localeCompare(b.period));

    expect(result).toEqual([
      { partnerCode: "RU", period: "2023-01", quantity100kg: 1500 },
      { partnerCode: "RU", period: "2023-02", quantity100kg: 2500 },
    ]);
  });

  it("maps a NULL quantity to 0", async () => {
    await db.insert(rawComextImports).values([
      row({ cn8ProductCode: "28141000", period: "2023-03", quantity100kg: null }),
    ]);

    expect(await getComextRowsByHeading("2814")).toEqual([
      { partnerCode: "RU", period: "2023-03", quantity100kg: 0 },
    ]);
  });

  it("returns [] for a heading with no rows", async () => {
    expect(await getComextRowsByHeading("9999")).toEqual([]);
  });
});
