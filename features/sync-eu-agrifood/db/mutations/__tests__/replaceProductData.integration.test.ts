import { describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { rawTaxudWeeklyRows } from "@/lib/db/schemas/rawTaxudWeeklyRows";
import type { RawTaxudWeekRow } from "@/features/sync-eu-agrifood/types";
import { replaceProductData } from "@/features/sync-eu-agrifood/db/mutations/replaceProductData";

const PRODUCT = "Ammonia";

function row(overrides: Partial<RawTaxudWeekRow>): RawTaxudWeekRow {
  return {
    sector: "Fertilisers",
    marketingYear: "2023",
    week: 1,
    memberStateCode: "FI",
    memberStateName: "Finland",
    partnerCode: "RU",
    partner: "Russia",
    product: PRODUCT,
    cn8ProductCode: "28141000",
    taric10ProductCode: "2814100000",
    procedure: 4000,
    preference: 100,
    euroValue: "100",
    unitValue: "1",
    kg: "100",
    kgEquivalent: "100",
    coefficient: "1",
    ...overrides,
  };
}

async function* asyncFrom<T>(items: T[]): AsyncGenerator<T> {
  for (const item of items) {
    yield item;
  }
}

const storedRows = () => db.select().from(rawTaxudWeeklyRows);

describe("replaceProductData", () => {
  it("stores every row a source yields, including exact duplicates, without merging or erroring", async () => {
    // The EU API can report two rows identical on every field it exposes
    // (confirmed live, ~1 in 12,000 rows) — with no business key to
    // collide on, both are simply stored, faithfully.
    const source = asyncFrom([row({ kg: "100" }), row({ kg: "100" })]);

    await replaceProductData({ product: PRODUCT, marketingYear: "2023", source });

    const stored = await storedRows();
    expect(stored).toHaveLength(2);
  });

  it("scoped to a marketingYear, replaces only that year's rows and leaves other years untouched", async () => {
    await replaceProductData({
      product: PRODUCT,
      marketingYear: "2023",
      source: asyncFrom([row({ marketingYear: "2023", kg: "111" })]),
    });

    await replaceProductData({
      product: PRODUCT,
      marketingYear: "2024",
      source: asyncFrom([row({ marketingYear: "2024", kg: "222" })]),
    });

    // Re-sync 2024 with corrected data; 2023 must be completely unaffected.
    await replaceProductData({
      product: PRODUCT,
      marketingYear: "2024",
      source: asyncFrom([row({ marketingYear: "2024", kg: "999" })]),
    });

    const stored = await storedRows();
    expect(stored).toHaveLength(2);
    const y2023 = stored.find((r) => r.marketingYear === "2023");
    const y2024 = stored.find((r) => r.marketingYear === "2024");
    expect(Number(y2023!.kg)).toBe(111);
    expect(Number(y2024!.kg)).toBe(999);
  });

  it("with no marketingYear given, replaces every row for the product regardless of year", async () => {
    await replaceProductData({
      product: PRODUCT,
      source: asyncFrom([row({ marketingYear: "2020", kg: "1" }), row({ marketingYear: "2021", kg: "2" })]),
    });

    await replaceProductData({
      product: PRODUCT,
      source: asyncFrom([row({ marketingYear: "2025", kg: "3" })]),
    });

    // The 2020/2021 rows from the first (full-history) call must be gone
    // entirely, not left behind alongside the new 2025 row.
    const stored = await storedRows();
    expect(stored).toHaveLength(1);
    expect(stored[0].marketingYear).toBe("2025");
  });

  it("writes every row a source yields, across more rows than fit in one batch", async () => {
    // 501 rows to force a second batch against the real (unconfigurable)
    // 500-row BATCH_SIZE — no override exists for it, since nothing in
    // production ever needs one.
    const rows = Array.from({ length: 501 }, (_, i) => row({ memberStateCode: `S${i}` }));

    const result = await replaceProductData({
      product: PRODUCT,
      marketingYear: "2023",
      source: asyncFrom(rows),
    });

    expect(result).toEqual({ rowsWritten: 501 });
    expect(await storedRows()).toHaveLength(501);
  });

  it("documents its precondition: given an empty source, it still deletes the existing scope and writes nothing", async () => {
    // This function does NOT protect against an empty source — that
    // check moved to runFertilizerSync.ts (see this file's doc comment).
    // This test exists to make that contract explicit and failing loudly
    // if it's ever accidentally restored here: the real incident this
    // table's design carries scar tissue from (an EU API product rename
    // making a previously-good query return zero rows, and the old code
    // deleting real data with nothing to replace it) is guarded against
    // one layer up, not in this function.
    await replaceProductData({
      product: PRODUCT,
      marketingYear: "2023",
      source: asyncFrom([row({ marketingYear: "2023", kg: "100" })]),
    });

    const result = await replaceProductData({
      product: PRODUCT,
      marketingYear: "2023",
      source: asyncFrom([]),
    });

    expect(result).toEqual({ rowsWritten: 0 });
    expect(await storedRows()).toHaveLength(0);
  });

  it("a source that fails partway leaves previously synced data for that scope completely untouched", async () => {
    await replaceProductData({
      product: PRODUCT,
      marketingYear: "2023",
      source: asyncFrom([row({ marketingYear: "2023", kg: "100" })]),
    });

    // A degraded re-sync of the same year that errors partway through —
    // proves the delete (already issued inside the transaction) rolls
    // back too, not just the inserts.
    async function* failingPartway(): AsyncGenerator<RawTaxudWeekRow> {
      yield row({ marketingYear: "2023", kg: "500" });
      throw new Error("simulated network failure mid-stream");
    }

    await expect(
      replaceProductData({ product: PRODUCT, marketingYear: "2023", source: failingPartway() }),
    ).rejects.toThrow();

    const stored = await storedRows();
    expect(stored).toHaveLength(1);
    expect(Number(stored[0].kg)).toBe(100);
  });
});
