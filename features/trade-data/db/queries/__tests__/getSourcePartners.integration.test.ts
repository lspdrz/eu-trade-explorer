import { describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { rawComextImports } from "@/lib/db/schemas/rawComextImports";
import { rawTaxudWeeklyRows } from "@/lib/db/schemas/rawTaxudWeeklyRows";
import { getSourcePartners } from "../getSourcePartners";

const comextRow = (partnerCode: string) => ({
  cn8ProductCode: "28141000",
  partnerCode,
  period: "2023-01",
  quantity100kg: "1",
  valueEuros: "1",
  syncedAt: new Date(),
});

const taxudRow = (partnerCode: string, partner: string) => ({
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

describe("getSourcePartners", () => {
  it("comext: distinct codes named via COMEXT_PARTNER_NAMES, unknowns dropped, sorted by name", async () => {
    await db.insert(rawComextImports).values([
      comextRow("RU"),
      comextRow("RU"),
      comextRow("EG"),
      comextRow("EXT_EU27_2020"), // aggregate — not in the name map, dropped
    ]);

    expect(await getSourcePartners("comext")).toEqual([
      { code: "EG", name: "Egypt" },
      { code: "RU", name: "Russia" },
    ]);
  });

  it("surveillance: distinct (code, name), sorted by name", async () => {
    await db.insert(rawTaxudWeeklyRows).values([
      taxudRow("RU", "Russia"),
      taxudRow("RU", "Russia"),
      taxudRow("US", "United States of America"),
    ]);

    expect(await getSourcePartners("surveillance")).toEqual([
      { code: "RU", name: "Russia" },
      { code: "US", name: "United States of America" },
    ]);
  });

  it("returns [] when the table is empty", async () => {
    expect(await getSourcePartners("comext")).toEqual([]);
  });
});
