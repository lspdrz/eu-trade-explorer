import { describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { rawComextImports } from "@/lib/db/schemas/rawComextImports";
import { getComextPartners } from "@/features/trade-data/db/queries/getComextPartners";

const row = (partnerCode: string) => ({
  cn8ProductCode: "28141000",
  partnerCode,
  period: "2023-01",
  quantity100kg: "1",
  valueEuros: "1",
  syncedAt: new Date(),
});

describe("getComextPartners", () => {
  it("distinct codes named via COMEXT_PARTNER_NAMES, unknowns dropped, sorted by name", async () => {
    await db.insert(rawComextImports).values([
      row("RU"),
      row("RU"),
      row("EG"),
      row("EXT_EU27_2020"), // aggregate — not in the name map, dropped
    ]);

    expect(await getComextPartners()).toEqual([
      { code: "EG", name: "Egypt" },
      { code: "RU", name: "Russia" },
    ]);
  });

  it("returns [] when the table is empty", async () => {
    expect(await getComextPartners()).toEqual([]);
  });
});
