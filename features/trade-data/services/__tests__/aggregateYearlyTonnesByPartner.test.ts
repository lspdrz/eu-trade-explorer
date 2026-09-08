import { describe, expect, it } from "vitest";
import type { TaxudWeekRow } from "../../types";
import { aggregateYearlyTonnesByPartner } from "../aggregateYearlyTonnesByPartner";

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

describe("aggregateYearlyTonnesByPartner", () => {
  it("sums kg across weeks and member states into tonnes for one year/partner", () => {
    const rows: TaxudWeekRow[] = [
      row({ week: 1, memberStateCode: "FI", kg: 10_000_000 }),
      row({ week: 2, memberStateCode: "FI", kg: 5_000_000 }),
      row({ week: 1, memberStateCode: "LT", kg: 1_000_000 }),
    ];

    const result = aggregateYearlyTonnesByPartner(rows);

    expect(result).toEqual([
      { year: "2023", partnerCode: "RU", partner: "Russia", tonnes: 16_000 },
    ]);
  });

  it("keeps separate totals per year and per partner", () => {
    const rows: TaxudWeekRow[] = [
      row({ marketingYear: "2022", partnerCode: "RU", partner: "Russia", kg: 2_000_000 }),
      row({ marketingYear: "2023", partnerCode: "RU", partner: "Russia", kg: 3_000_000 }),
      row({ marketingYear: "2023", partnerCode: "EG", partner: "Egypt", kg: 1_000_000 }),
    ];

    const result = aggregateYearlyTonnesByPartner(rows);

    expect(result).toEqual([
      { year: "2022", partnerCode: "RU", partner: "Russia", tonnes: 2_000 },
      { year: "2023", partnerCode: "EG", partner: "Egypt", tonnes: 1_000 },
      { year: "2023", partnerCode: "RU", partner: "Russia", tonnes: 3_000 },
    ]);
  });

  it("returns an empty array for no input rows", () => {
    expect(aggregateYearlyTonnesByPartner([])).toEqual([]);
  });
});
