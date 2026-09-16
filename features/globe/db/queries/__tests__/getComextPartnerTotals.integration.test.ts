import { describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { rawComextImports } from "@/lib/db/schemas/rawComextImports";
import { getComextPartnerTotals } from "@/features/globe/db/queries/getComextPartnerTotals";

const row = (
  cn8ProductCode: string,
  partnerCode: string,
  quantity100kg: string | null,
  period = "2023-01",
) => ({
  cn8ProductCode,
  partnerCode,
  period,
  quantity100kg,
  valueEuros: "1",
  syncedAt: new Date(),
});

describe("getComextPartnerTotals", () => {
  it("sums rows under either fertilizer heading (2814, 3102) per partner, and nothing else", async () => {
    await db.insert(rawComextImports).values([
      row("28141000", "RU", "10"), // 2814 — ammonia
      row("31021010", "EG", "20"), // 3102 — nitrogenous
      row("31025000", "DZ", "30"), // 3102 — another CN8
      row("28129000", "RU", "999"), // 2812 — not fertilizer
      row("31051000", "EG", "999"), // 3105 — not in scope
    ]);

    const rows = await getComextPartnerTotals();

    expect(rows).toEqual(
      expect.arrayContaining([
        { partnerCode: "RU", quantity100kg: 10 },
        { partnerCode: "EG", quantity100kg: 20 },
        { partnerCode: "DZ", quantity100kg: 30 },
      ]),
    );
    expect(rows).toHaveLength(3);
  });

  it("sums a partner's rows across headings and periods into one total", async () => {
    await db.insert(rawComextImports).values([
      row("28141000", "RU", "10", "2015-06"),
      row("31021010", "RU", "5", "2023-11"),
    ]);
    expect(await getComextPartnerTotals()).toEqual([
      { partnerCode: "RU", quantity100kg: 15 },
    ]);
  });

  it("coerces an all-null quantity group to 0", async () => {
    await db.insert(rawComextImports).values([row("28142000", "RU", null)]);
    expect(await getComextPartnerTotals()).toEqual([
      { partnerCode: "RU", quantity100kg: 0 },
    ]);
  });

  it("returns [] when the table is empty", async () => {
    expect(await getComextPartnerTotals()).toEqual([]);
  });
});
