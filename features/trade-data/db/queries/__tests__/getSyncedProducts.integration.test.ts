import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { rawTaxudWeeklyRows } from "@/lib/db/schemas/rawTaxudWeeklyRows";
import { getSyncedProducts } from "../getSyncedProducts";

const TEST_PREFIX = "__test_products__";

function rawRow(product: string) {
  return {
    sector: "Fertilisers",
    marketingYear: "2023",
    week: 1,
    memberStateCode: "FI",
    memberStateName: "Finland",
    partnerCode: "RU",
    partner: "Russia",
    product,
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
  };
}

describe("getSyncedProducts", () => {
  afterEach(async () => {
    await db
      .delete(rawTaxudWeeklyRows)
      .where(sql`${rawTaxudWeeklyRows.product} LIKE ${TEST_PREFIX + "%"}`);
  });

  it("returns distinct product values, sorted, with no duplicates", async () => {
    await db.insert(rawTaxudWeeklyRows).values([
      rawRow(`${TEST_PREFIX}_b`),
      rawRow(`${TEST_PREFIX}_b`),
      rawRow(`${TEST_PREFIX}_a`),
    ]);

    const products = await getSyncedProducts();

    const testOnly = products.filter((p) => p.startsWith(TEST_PREFIX));
    expect(testOnly).toEqual([`${TEST_PREFIX}_a`, `${TEST_PREFIX}_b`]);
  });
});
