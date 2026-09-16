import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/globe/db/queries/getComextPartnerTotals", () => ({
  getComextPartnerTotals: vi.fn(),
}));

import { getComextPartnerTotals } from "@/features/globe/db/queries/getComextPartnerTotals";
import { getCountryImportTotals } from "@/features/globe/lib/getCountryImportTotals";

describe("getCountryImportTotals", () => {
  it("converts each partner's 100-kg total to tonnes", () => {
    vi.mocked(getComextPartnerTotals).mockResolvedValue([
      { partnerCode: "RU", quantity100kg: 15_000 }, // 1500 t
      { partnerCode: "EG", quantity100kg: 2_000 }, //  200 t
    ]);
    return expect(getCountryImportTotals()).resolves.toEqual([
      { partnerCode: "RU", partner: "Russia", tonnes: 1500 },
      { partnerCode: "EG", partner: "Egypt", tonnes: 200 },
    ]);
  });

  it("drops partner codes absent from the name map (aggregates, pseudo-codes)", () => {
    vi.mocked(getComextPartnerTotals).mockResolvedValue([
      { partnerCode: "EXT_EU27_2020", quantity100kg: 999_999 },
      { partnerCode: "QW", quantity100kg: 999_999 },
      { partnerCode: "EG", quantity100kg: 1_000 },
    ]);
    return expect(getCountryImportTotals()).resolves.toEqual([
      { partnerCode: "EG", partner: "Egypt", tonnes: 100 },
    ]);
  });

  it("sorts by tonnes descending, ties broken by partner code ascending", async () => {
    vi.mocked(getComextPartnerTotals).mockResolvedValue([
      { partnerCode: "EG", quantity100kg: 1_000 },
      { partnerCode: "DZ", quantity100kg: 1_000 },
      { partnerCode: "RU", quantity100kg: 5_000 },
    ]);
    const totals = await getCountryImportTotals();
    expect(totals.map((t) => t.partnerCode)).toEqual(["RU", "DZ", "EG"]);
  });

  it("treats a 0 quantity as a real zero observation", () => {
    vi.mocked(getComextPartnerTotals).mockResolvedValue([
      { partnerCode: "RU", quantity100kg: 0 },
    ]);
    return expect(getCountryImportTotals()).resolves.toEqual([
      { partnerCode: "RU", partner: "Russia", tonnes: 0 },
    ]);
  });

  it("returns [] for no rows", () => {
    vi.mocked(getComextPartnerTotals).mockResolvedValue([]);
    return expect(getCountryImportTotals()).resolves.toEqual([]);
  });
});
