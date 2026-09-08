import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { taxudWeeklyRows } from "@/lib/db/schemas/taxudWeeklyRows";
import { getWeeklyRowsByProduct } from "../getWeeklyRowsByProduct";

const TEST_PRODUCT = "__test_product__";

async function cleanUpTestRows() {
  await db.delete(taxudWeeklyRows).where(sql`${taxudWeeklyRows.product} = ${TEST_PRODUCT}`);
}

function rawRow(overrides: Partial<typeof taxudWeeklyRows.$inferInsert>) {
  return {
    sector: "Fertilisers",
    marketingYear: "2023",
    week: 1,
    memberStateCode: "FI",
    memberStateName: "Finland",
    partnerCode: "RU",
    partner: "Russia",
    product: TEST_PRODUCT,
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
  afterEach(async () => {
    await cleanUpTestRows();
  });

  it("reads raw rows for a product, converting numeric fields from strings", async () => {
    const syncedAt = new Date();
    await db.insert(taxudWeeklyRows).values([
      rawRow({
        week: 1,
        memberStateCode: "FI",
        partnerCode: "RU",
        partner: "Russia",
        euroValue: "123.45",
        unitValue: "6.7",
        kg: "10000000",
        kgEquivalent: "9999999",
        coefficient: "1.5",
        syncedAt,
      }),
    ]);

    const result = await getWeeklyRowsByProduct(TEST_PRODUCT);

    expect(result).toEqual([
      {
        id: expect.any(Number),
        sector: "Fertilisers",
        marketingYear: "2023",
        week: 1,
        memberStateCode: "FI",
        memberStateName: "Finland",
        partnerCode: "RU",
        partner: "Russia",
        product: TEST_PRODUCT,
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
    await db.insert(taxudWeeklyRows).values([
      rawRow({ product: TEST_PRODUCT }),
      rawRow({ product: "__other_test_product__" }),
    ]);

    const result = await getWeeklyRowsByProduct(TEST_PRODUCT);

    expect(result).toHaveLength(1);
    expect(result[0].product).toBe(TEST_PRODUCT);

    await db.delete(taxudWeeklyRows).where(sql`${taxudWeeklyRows.product} = '__other_test_product__'`);
  });

  it("returns an empty array when there's no data for a product", async () => {
    const result = await getWeeklyRowsByProduct(TEST_PRODUCT);
    expect(result).toEqual([]);
  });
});
