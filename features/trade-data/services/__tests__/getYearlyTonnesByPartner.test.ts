import { describe, expect, it, vi } from "vitest";
import type { TaxudWeekRow } from "../../types";

vi.mock("../../db/queries/getWeeklyRowsByProduct", () => ({
  getWeeklyRowsByProduct: vi.fn(),
}));

import { getWeeklyRowsByProduct } from "../../db/queries/getWeeklyRowsByProduct";
import { getYearlyTonnesByPartner } from "../getYearlyTonnesByPartner";

function row(overrides: Partial<TaxudWeekRow>): TaxudWeekRow {
  return {
    id: 1,
    sector: "Fertilisers",
    marketingYear: "2023",
    week: 1,
    memberStateCode: "FI",
    memberStateName: "Finland",
    partnerCode: "RU",
    partner: "Russia",
    product: "Ammonia",
    cn8ProductCode: "28141000",
    taric10ProductCode: "2814100000",
    procedure: 4000,
    preference: 100,
    euroValue: 0,
    unitValue: 0,
    kg: 0,
    kgEquivalent: 0,
    coefficient: 1,
    syncedAt: new Date(),
    ...overrides,
  };
}

describe("getYearlyTonnesByPartner (service)", () => {
  it("passes the product straight through to the query", async () => {
    vi.mocked(getWeeklyRowsByProduct).mockResolvedValue([]);

    await getYearlyTonnesByPartner("Urea");

    expect(getWeeklyRowsByProduct).toHaveBeenCalledWith("Urea");
  });

  it("aggregates whatever raw rows the query returns", async () => {
    vi.mocked(getWeeklyRowsByProduct).mockResolvedValue([
      row({ week: 1, memberStateCode: "FI", kg: 10_000_000 }),
      row({ week: 2, memberStateCode: "FI", kg: 5_000_000 }),
    ]);

    const result = await getYearlyTonnesByPartner("Ammonia");

    expect(result).toEqual([
      { year: "2023", partnerCode: "RU", partner: "Russia", tonnes: 15_000 },
    ]);
  });

  it("returns an empty array when the query returns no rows", async () => {
    vi.mocked(getWeeklyRowsByProduct).mockResolvedValue([]);

    const result = await getYearlyTonnesByPartner("Ammonia");

    expect(result).toEqual([]);
  });
});
