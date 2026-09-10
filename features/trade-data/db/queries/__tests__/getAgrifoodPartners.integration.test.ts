import { describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { rawTaxudWeeklyRows } from "@/lib/db/schemas/rawTaxudWeeklyRows";
import { getAgrifoodPartners } from "@/features/trade-data/db/queries/getAgrifoodPartners";

const row = (partnerCode: string, partner: string) => ({
  sector: "Fertilisers",
  marketingYear: "2023",
  week: 1,
  memberStateCode: "FI",
  memberStateName: "Finland",
  partnerCode,
  partner,
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
});

describe("getAgrifoodPartners", () => {
  it("distinct (code, name), sorted by name", async () => {
    await db.insert(rawTaxudWeeklyRows).values([
      row("RU", "Russia"),
      row("RU", "Russia"),
      row("US", "United States of America"),
    ]);

    expect(await getAgrifoodPartners()).toEqual([
      { code: "RU", name: "Russia" },
      { code: "US", name: "United States of America" },
    ]);
  });

  it("returns [] when the table is empty", async () => {
    expect(await getAgrifoodPartners()).toEqual([]);
  });
});
