import { describe, expect, it, vi } from "vitest";
import type { HeadingGroup, RuYearRow } from "@/features/ru-trade-timeline/types";

vi.mock("@/features/ru-trade-timeline/db/queries/getAllComextRuRows", () => ({
  getAllComextRuRows: vi.fn(),
}));

import { getAllComextRuRows } from "@/features/ru-trade-timeline/db/queries/getAllComextRuRows";
import {
  aggregateRuYearlyTonnes,
  getRuYearlyTonnesByHeading,
} from "@/features/ru-trade-timeline/lib/getRuYearlyTonnesByHeading";

const r = (o: Partial<RuYearRow>): RuYearRow => ({
  cn8ProductCode: "28141000",
  period: "2023-01",
  quantity100kg: 0,
  ...o,
});

const GROUPS: HeadingGroup[] = [
  { key: "fertiliser", label: "Fertiliser", cn8Prefixes: ["2814", "3102"] },
  { key: "rest", label: "Everything else" },
];

describe("aggregateRuYearlyTonnes (pure)", () => {
  it("buckets rows into the first matching prefixed group", () => {
    const rows = [
      r({ cn8ProductCode: "28141000", period: "2023-01", quantity100kg: 10_000 }), // fertiliser, 1000t
      r({ cn8ProductCode: "31021090", period: "2023-01", quantity100kg: 5_000 }), // fertiliser, 500t
      r({ cn8ProductCode: "85423100", period: "2023-01", quantity100kg: 1_000 }), // rest, 100t
    ];
    expect(aggregateRuYearlyTonnes(rows, GROUPS)).toEqual({
      years: [2023],
      series: [
        { key: "fertiliser", label: "Fertiliser", values: [1500] },
        { key: "rest", label: "Everything else", values: [100] },
      ],
    });
  });

  it("drops rows matching nothing when there's no catch-all group", () => {
    const noCatchAll: HeadingGroup[] = [
      { key: "fertiliser", label: "Fertiliser", cn8Prefixes: ["2814"] },
    ];
    const rows = [r({ cn8ProductCode: "85423100", quantity100kg: 999_999 })];
    expect(aggregateRuYearlyTonnes(rows, noCatchAll)).toEqual({
      years: [2023],
      series: [{ key: "fertiliser", label: "Fertiliser", values: [0] }],
    });
  });

  it("zero-fills gap years across the full min..max range", () => {
    const rows = [
      r({ cn8ProductCode: "28141000", period: "2020-01", quantity100kg: 10_000 }),
      r({ cn8ProductCode: "28141000", period: "2023-01", quantity100kg: 20_000 }),
    ];
    const result = aggregateRuYearlyTonnes(rows, GROUPS);
    expect(result.years).toEqual([2020, 2021, 2022, 2023]);
    expect(result.series[0].values).toEqual([1000, 0, 0, 2000]);
  });

  it("sums multiple CN8 rows in the same (group, year)", () => {
    const rows = [
      r({ cn8ProductCode: "28141000", period: "2023-05", quantity100kg: 2_000 }),
      r({ cn8ProductCode: "28142000", period: "2023-05", quantity100kg: 3_000 }),
    ];
    expect(aggregateRuYearlyTonnes(rows, GROUPS).series[0].values).toEqual([500]);
  });

  it("returns empty years and zero-length series for no rows", () => {
    expect(aggregateRuYearlyTonnes([], GROUPS)).toEqual({
      years: [],
      series: [
        { key: "fertiliser", label: "Fertiliser", values: [] },
        { key: "rest", label: "Everything else", values: [] },
      ],
    });
  });
});

describe("getRuYearlyTonnesByHeading (service)", () => {
  it("aggregates whatever the query returns", async () => {
    vi.mocked(getAllComextRuRows).mockResolvedValue([
      r({ cn8ProductCode: "28141000", period: "2023-01", quantity100kg: 10_000 }),
    ]);
    expect(await getRuYearlyTonnesByHeading(GROUPS)).toEqual({
      years: [2023],
      series: [
        { key: "fertiliser", label: "Fertiliser", values: [1000] },
        { key: "rest", label: "Everything else", values: [0] },
      ],
    });
  });
});
