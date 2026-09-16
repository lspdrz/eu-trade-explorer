import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/trade-data/db/queries/getComextYearlyTotalsByHeading", () => ({
  getComextYearlyTotalsByHeading: vi.fn(),
}));

import { getComextYearlyTotalsByHeading } from "@/features/trade-data/db/queries/getComextYearlyTotalsByHeading";
import { getComextYearlyTonnesByPartner } from "@/features/trade-data/lib/getComextYearlyTonnesByPartner";

describe("getComextYearlyTonnesByPartner", () => {
  it("resolves the product to its heading and passes it to the query", async () => {
    vi.mocked(getComextYearlyTotalsByHeading).mockResolvedValue([]);
    await getComextYearlyTonnesByPartner("Nitrogenous fertilisers");
    expect(getComextYearlyTotalsByHeading).toHaveBeenCalledWith("3102");
  });

  it("returns [] for an unknown product without hitting the query", async () => {
    vi.mocked(getComextYearlyTotalsByHeading).mockClear();
    expect(await getComextYearlyTonnesByPartner("Urea")).toEqual([]);
    expect(getComextYearlyTotalsByHeading).not.toHaveBeenCalled();
  });

  it("converts each row's 100-kg quantity into tonnes", async () => {
    vi.mocked(getComextYearlyTotalsByHeading).mockResolvedValue([
      { partnerCode: "RU", year: "2023", quantity100kg: 15_000 }, // 1500 t
      { partnerCode: "RU", year: "2022", quantity100kg: 1_000 }, //  100 t
    ]);
    expect(await getComextYearlyTonnesByPartner("Ammonia")).toEqual([
      { year: "2022", partnerCode: "RU", partner: "Russia", tonnes: 100 },
      { year: "2023", partnerCode: "RU", partner: "Russia", tonnes: 1500 },
    ]);
  });

  it("drops partner codes not in the name map (aggregates, pseudo-codes)", async () => {
    vi.mocked(getComextYearlyTotalsByHeading).mockResolvedValue([
      { partnerCode: "EXT_EU27_2020", year: "2023", quantity100kg: 999_999 },
      { partnerCode: "QW", year: "2023", quantity100kg: 999_999 },
      { partnerCode: "RU", year: "2023", quantity100kg: 10_000 },
    ]);
    expect(await getComextYearlyTonnesByPartner("Ammonia")).toEqual([
      { year: "2023", partnerCode: "RU", partner: "Russia", tonnes: 1000 },
    ]);
  });

  it("treats a 0 quantity as a real (zero) observation", async () => {
    vi.mocked(getComextYearlyTotalsByHeading).mockResolvedValue([
      { partnerCode: "RU", year: "2023", quantity100kg: 0 },
    ]);
    expect(await getComextYearlyTonnesByPartner("Ammonia")).toEqual([
      { year: "2023", partnerCode: "RU", partner: "Russia", tonnes: 0 },
    ]);
  });

  it("sorts by year then partner code", async () => {
    vi.mocked(getComextYearlyTotalsByHeading).mockResolvedValue([
      { partnerCode: "RU", year: "2023", quantity100kg: 10 },
      { partnerCode: "EG", year: "2023", quantity100kg: 10 },
      { partnerCode: "RU", year: "2021", quantity100kg: 10 },
    ]);
    const totals = await getComextYearlyTonnesByPartner("Ammonia");
    expect(totals.map((t) => `${t.year}/${t.partnerCode}`)).toEqual([
      "2021/RU",
      "2023/EG",
      "2023/RU",
    ]);
  });

  it("returns [] for no rows", async () => {
    vi.mocked(getComextYearlyTotalsByHeading).mockResolvedValue([]);
    expect(await getComextYearlyTonnesByPartner("Ammonia")).toEqual([]);
  });
});
