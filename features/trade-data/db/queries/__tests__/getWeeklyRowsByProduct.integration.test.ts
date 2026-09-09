import { describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { rawTaxudWeeklyRows } from "@/lib/db/schemas/rawTaxudWeeklyRows";
import { getWeeklyRowsByProduct } from "../getWeeklyRowsByProduct";

function rawRow(overrides: Partial<typeof rawTaxudWeeklyRows.$inferInsert>) {
  return {
    sector: "Fertilisers",
    marketingYear: "2023",
    week: 1,
    memberStateCode: "FI",
    memberStateName: "Finland",
    partnerCode: "RU",
    partner: "Russia",
    product: "Ammonia",
    cn8ProductCode: "28141000",
    taric10ProductCode: "2814100000",
    procedure: 4000,
    preference: 100,
    euroValue: "0",
    unitValue: "0",
    kg: "0",
    kgEquivalent: "0",
    coefficient: "1",
    syncedAt: new Date(),
    ...overrides,
  };
}

describe("getWeeklyRowsByProduct", () => {
  it("reads raw rows for a product, converting numeric fields from strings", async () => {
    const syncedAt = new Date();
    await db.insert(rawTaxudWeeklyRows).values([
      rawRow({
        euroValue: "123.45",
        unitValue: "6.7",
        kg: "10000000",
        kgEquivalent: "9999999",
        coefficient: "1.5",
        syncedAt,
      }),
    ]);

    expect(await getWeeklyRowsByProduct("Ammonia")).toEqual([
      {
        id: expect.any(Number),
        sector: "Fertilisers",
        marketingYear: "2023",
        week: 1,
        memberStateCode: "FI",
        memberStateName: "Finland",
        partnerCode: "RU",
        partner: "Russia",
        product: "Ammonia",
        cn8ProductCode: "28141000",
        taric10ProductCode: "2814100000",
        procedure: 4000,
        preference: 100,
        euroValue: 123.45,
        unitValue: 6.7,
        kg: 10_000_000,
        kgEquivalent: 9999999,
        coefficient: 1.5,
        syncedAt,
      },
    ]);
  });

  it("only returns rows for the requested product", async () => {
    await db
      .insert(rawTaxudWeeklyRows)
      .values([rawRow({ product: "Ammonia" }), rawRow({ product: "Urea" })]);

    const result = await getWeeklyRowsByProduct("Ammonia");
    expect(result).toHaveLength(1);
    expect(result[0].product).toBe("Ammonia");
  });

  it("returns an empty array when there's no data for a product", async () => {
    expect(await getWeeklyRowsByProduct("Ammonia")).toEqual([]);
  });
});
