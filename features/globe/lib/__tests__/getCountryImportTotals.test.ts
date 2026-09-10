import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/globe/db/queries/getComextImportRows", () => ({
  getComextImportRows: vi.fn(),
}));

import { getComextImportRows } from "@/features/globe/db/queries/getComextImportRows";
import {
  aggregateCountryTotals,
  getCountryImportTotals,
} from "@/features/globe/lib/getCountryImportTotals";

describe("aggregateCountryTotals (pure)", () => {
  it("sums 100-kg quantities into tonnes per partner across headings", () => {
    const rows = [
      { partnerCode: "RU", quantity100kg: 10_000 }, // 1000 t
      { partnerCode: "RU", quantity100kg: 5_000 }, //  500 t
      { partnerCode: "EG", quantity100kg: 2_000 }, //  200 t
    ];
    expect(aggregateCountryTotals(rows)).toEqual([
      { partnerCode: "RU", partner: "Russia", tonnes: 1500 },
      { partnerCode: "EG", partner: "Egypt", tonnes: 200 },
    ]);
  });

  it("drops partner codes absent from the name map (aggregates, pseudo-codes)", () => {
    const rows = [
      { partnerCode: "EXT_EU27_2020", quantity100kg: 999_999 },
      { partnerCode: "QW", quantity100kg: 999_999 },
      { partnerCode: "EG", quantity100kg: 1_000 },
    ];
    expect(aggregateCountryTotals(rows)).toEqual([
      { partnerCode: "EG", partner: "Egypt", tonnes: 100 },
    ]);
  });

  it("sorts by tonnes descending, ties broken by partner code ascending", () => {
    const rows = [
      { partnerCode: "EG", quantity100kg: 1_000 },
      { partnerCode: "DZ", quantity100kg: 1_000 },
      { partnerCode: "RU", quantity100kg: 5_000 },
    ];
    expect(aggregateCountryTotals(rows).map((t) => t.partnerCode)).toEqual([
      "RU",
      "DZ",
      "EG",
    ]);
  });

  it("treats a 0 quantity as a real zero observation", () => {
    expect(
      aggregateCountryTotals([{ partnerCode: "RU", quantity100kg: 0 }]),
    ).toEqual([{ partnerCode: "RU", partner: "Russia", tonnes: 0 }]);
  });

  it("returns [] for no rows", () => {
    expect(aggregateCountryTotals([])).toEqual([]);
  });
});

describe("getCountryImportTotals (service)", () => {
  it("aggregates whatever the query returns", async () => {
    vi.mocked(getComextImportRows).mockResolvedValue([
      { partnerCode: "RU", quantity100kg: 10_000 },
    ]);
    expect(await getCountryImportTotals()).toEqual([
      { partnerCode: "RU", partner: "Russia", tonnes: 1000 },
    ]);
  });
});
