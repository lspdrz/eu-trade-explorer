import { describe, expect, it } from "vitest";
import type { YearlyPartnerTotal } from "../../../types";
import { selectGroupedSeries } from "../selectGroupedSeries";

function total(o: Partial<YearlyPartnerTotal>): YearlyPartnerTotal {
  return { year: "2020", partnerCode: "US", partner: "United States", tonnes: 0, ...o };
}

describe("selectGroupedSeries", () => {
  it("builds the full partnerCode x year grid in selection order, zero-filling gaps", () => {
    const totals = [
      total({ year: "2020", partnerCode: "US", tonnes: 100 }),
      total({ year: "2021", partnerCode: "US", tonnes: 150 }),
      total({ year: "2021", partnerCode: "EG", tonnes: 80 }),
    ];

    const result = selectGroupedSeries(totals, {
      partnerCodes: ["US", "EG"],
      fromYear: 2020,
      toYear: 2021,
    });

    expect(result.years).toEqual([2020, 2021]);
    expect(result.points).toEqual([
      { partnerCode: "US", year: 2020, tonnes: 100 },
      { partnerCode: "US", year: 2021, tonnes: 150 },
      { partnerCode: "EG", year: 2020, tonnes: 0 },
      { partnerCode: "EG", year: 2021, tonnes: 80 },
    ]);
  });

  it("excludes years outside the range and partners not selected", () => {
    const totals = [
      total({ year: "2019", partnerCode: "US", tonnes: 999 }),
      total({ year: "2020", partnerCode: "US", tonnes: 10 }),
      total({ year: "2020", partnerCode: "RU", tonnes: 500 }),
    ];

    const result = selectGroupedSeries(totals, {
      partnerCodes: ["US"],
      fromYear: 2020,
      toYear: 2020,
    });

    expect(result.points).toEqual([{ partnerCode: "US", year: 2020, tonnes: 10 }]);
  });

  it("returns empty points when no countries are selected", () => {
    const result = selectGroupedSeries([total({ tonnes: 5 })], {
      partnerCodes: [],
      fromYear: 2020,
      toYear: 2022,
    });
    expect(result).toEqual({ years: [2020, 2021, 2022], points: [] });
  });

  it("returns empty years when the range is inverted", () => {
    const result = selectGroupedSeries([], {
      partnerCodes: ["US"],
      fromYear: 2022,
      toYear: 2020,
    });
    expect(result).toEqual({ years: [], points: [] });
  });
});
