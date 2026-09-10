import { describe, expect, it, vi } from "vitest";
import type { ComextYearRow } from "../../types";

vi.mock("../../db/queries/getComextRowsByHeading", () => ({
  getComextRowsByHeading: vi.fn(),
}));

import { getComextRowsByHeading } from "../../db/queries/getComextRowsByHeading";
import {
  aggregateComextYearlyTonnes,
  getComextYearlyTonnesByPartner,
} from "../getComextYearlyTonnesByPartner";

const r = (o: Partial<ComextYearRow>): ComextYearRow => ({
  partnerCode: "RU",
  period: "2023-01",
  quantity100kg: 0,
  ...o,
});

describe("aggregateComextYearlyTonnes (pure)", () => {
  it("folds monthly 100-kg quantities into yearly tonnes per partner", () => {
    const rows = [
      r({ partnerCode: "RU", period: "2023-01", quantity100kg: 10_000 }), // 1000 t
      r({ partnerCode: "RU", period: "2023-02", quantity100kg: 5_000 }), //  500 t
      r({ partnerCode: "RU", period: "2022-12", quantity100kg: 1_000 }), //  100 t (diff year)
    ];
    expect(aggregateComextYearlyTonnes(rows)).toEqual([
      { year: "2022", partnerCode: "RU", partner: "Russia", tonnes: 100 },
      { year: "2023", partnerCode: "RU", partner: "Russia", tonnes: 1500 },
    ]);
  });

  it("sums multiple CN8 rows in the same (year, partner) — headings collapse", () => {
    const rows = [
      r({ partnerCode: "EG", period: "2023-05", quantity100kg: 2_000 }),
      r({ partnerCode: "EG", period: "2023-05", quantity100kg: 3_000 }),
    ];
    expect(aggregateComextYearlyTonnes(rows)).toEqual([
      { year: "2023", partnerCode: "EG", partner: "Egypt", tonnes: 500 },
    ]);
  });

  it("drops partner codes not in the name map (aggregates, pseudo-codes)", () => {
    const rows = [
      r({ partnerCode: "EXT_EU27_2020", quantity100kg: 999_999 }),
      r({ partnerCode: "QW", quantity100kg: 999_999 }),
      r({ partnerCode: "RU", period: "2023-01", quantity100kg: 10_000 }),
    ];
    expect(aggregateComextYearlyTonnes(rows)).toEqual([
      { year: "2023", partnerCode: "RU", partner: "Russia", tonnes: 1000 },
    ]);
  });

  it("treats a 0 quantity as a real (zero) observation", () => {
    const rows = [r({ partnerCode: "RU", period: "2023-01", quantity100kg: 0 })];
    expect(aggregateComextYearlyTonnes(rows)).toEqual([
      { year: "2023", partnerCode: "RU", partner: "Russia", tonnes: 0 },
    ]);
  });

  it("sorts by year then partner code", () => {
    const rows = [
      r({ partnerCode: "RU", period: "2023-01", quantity100kg: 10 }),
      r({ partnerCode: "EG", period: "2023-01", quantity100kg: 10 }),
      r({ partnerCode: "RU", period: "2021-01", quantity100kg: 10 }),
    ];
    expect(aggregateComextYearlyTonnes(rows).map((t) => `${t.year}/${t.partnerCode}`)).toEqual([
      "2021/RU",
      "2023/EG",
      "2023/RU",
    ]);
  });

  it("returns [] for no rows", () => {
    expect(aggregateComextYearlyTonnes([])).toEqual([]);
  });
});

describe("getComextYearlyTonnesByPartner (service)", () => {
  it("resolves the product to its heading and passes it to the query", async () => {
    vi.mocked(getComextRowsByHeading).mockResolvedValue([]);
    await getComextYearlyTonnesByPartner("Nitrogenous fertilisers");
    expect(getComextRowsByHeading).toHaveBeenCalledWith("3102");
  });

  it("aggregates whatever the query returns", async () => {
    vi.mocked(getComextRowsByHeading).mockResolvedValue([
      { partnerCode: "RU", period: "2023-01", quantity100kg: 10_000 },
    ]);
    expect(await getComextYearlyTonnesByPartner("Ammonia")).toEqual([
      { year: "2023", partnerCode: "RU", partner: "Russia", tonnes: 1000 },
    ]);
  });

  it("returns [] for an unknown product without hitting the query", async () => {
    vi.mocked(getComextRowsByHeading).mockClear();
    expect(await getComextYearlyTonnesByPartner("Urea")).toEqual([]);
    expect(getComextRowsByHeading).not.toHaveBeenCalled();
  });
});
