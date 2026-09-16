import { describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { rawComextImports } from "@/lib/db/schemas/rawComextImports";
import { getComextYearlyTotalsByHeading } from "@/features/trade-data/db/queries/getComextYearlyTotalsByHeading";

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

const sorted = (rows: { year: string; partnerCode: string }[]) =>
  [...rows].sort(
    (a, b) => a.year.localeCompare(b.year) || a.partnerCode.localeCompare(b.partnerCode),
  );

describe("getComextYearlyTotalsByHeading", () => {
  it("sums rows whose CN8 code starts with the heading into one total per (year, partner)", async () => {
    await db.insert(rawComextImports).values([
      row({ cn8ProductCode: "28141000", period: "2023-01", quantity100kg: "1500" }),
      row({ cn8ProductCode: "28142000", period: "2023-02", quantity100kg: "2500" }),
      row({ cn8ProductCode: "31021090", period: "2023-01", quantity100kg: "9999" }), // 3102 — excluded
    ]);

    expect(await getComextYearlyTotalsByHeading("2814")).toEqual([
      { year: "2023", partnerCode: "RU", quantity100kg: 4000 },
    ]);
  });

  it("keeps different years and different partners separate", async () => {
    await db.insert(rawComextImports).values([
      row({ partnerCode: "RU", period: "2023-01", quantity100kg: "1000" }),
      row({ partnerCode: "RU", period: "2022-12", quantity100kg: "500" }),
      row({ partnerCode: "EG", period: "2023-01", quantity100kg: "300" }),
    ]);

    expect(sorted(await getComextYearlyTotalsByHeading("2814"))).toEqual([
      { year: "2022", partnerCode: "RU", quantity100kg: 500 },
      { year: "2023", partnerCode: "EG", quantity100kg: 300 },
      { year: "2023", partnerCode: "RU", quantity100kg: 1000 },
    ]);
  });

  it("coerces an all-null quantity group to 0", async () => {
    await db.insert(rawComextImports).values([
      row({ cn8ProductCode: "28141000", period: "2023-03", quantity100kg: null }),
    ]);

    expect(await getComextYearlyTotalsByHeading("2814")).toEqual([
      { year: "2023", partnerCode: "RU", quantity100kg: 0 },
    ]);
  });

  it("returns [] for a heading with no rows", async () => {
    expect(await getComextYearlyTotalsByHeading("9999")).toEqual([]);
  });
});
