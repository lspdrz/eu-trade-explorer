import { describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { rawTaxudWeeklyRows } from "@/lib/db/schemas/rawTaxudWeeklyRows";
import { getAgrifoodProducts } from "../getAgrifoodProducts";

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

describe("getAgrifoodProducts", () => {
  it("returns distinct product values, sorted, with no duplicates", async () => {
    await db
      .insert(rawTaxudWeeklyRows)
      .values([rawRow("Urea"), rawRow("Urea"), rawRow("Ammonia")]);

    expect(await getAgrifoodProducts()).toEqual(["Ammonia", "Urea"]);
  });

  it("returns [] when nothing is synced", async () => {
    expect(await getAgrifoodProducts()).toEqual([]);
  });
});
