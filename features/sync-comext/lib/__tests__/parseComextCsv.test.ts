import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseComextCsv } from "@/features/sync-comext/lib/parseComextCsv";

const fixture = readFileSync(
  join(__dirname, "fixtures/comext-2814-ru-eg-2023q1.csv"),
  "utf8",
);

describe("parseComextCsv", () => {
  it("folds the two indicator rows into one observation per (cn8, partner, period)", () => {
    const rows = parseComextCsv(fixture);

    // EG/28141000 x 3 months + RU/28141000 x 3 months + RU/28142000/2023-02
    expect(rows).toHaveLength(7);
    expect(rows).toContainEqual({
      cn8ProductCode: "28141000",
      partnerCode: "RU",
      period: "2023-01",
      quantity100kg: 126015,
      valueEuros: 11140802,
    });
    expect(rows).toContainEqual({
      cn8ProductCode: "28141000",
      partnerCode: "EG",
      period: "2023-03",
      quantity100kg: 188435.72,
      valueEuros: 11658238,
    });
    expect(rows).toContainEqual({
      cn8ProductCode: "28142000",
      partnerCode: "RU",
      period: "2023-02",
      quantity100kg: 236.6,
      valueEuros: 10056,
    });
  });

  it("emits nothing for a (cn8, partner) with no rows", () => {
    const rows = parseComextCsv(fixture);
    expect(
      rows.some((r) => r.partnerCode === "EG" && r.cn8ProductCode === "28142000"),
    ).toBe(false);
  });

  it("reads column positions from the header, not a fixed order", () => {
    const reordered =
      "OBS_VALUE,TIME_PERIOD,indicators,flow,product,partner,reporter,freq,STRUCTURE_ID,STRUCTURE\n" +
      "500,2024-06,QUANTITY_IN_100KG,1,31021090,US,EU27_2020,M,x,dataflow\n";
    expect(parseComextCsv(reordered)).toEqual([
      {
        cn8ProductCode: "31021090",
        partnerCode: "US",
        period: "2024-06",
        quantity100kg: 500,
        valueEuros: null,
      },
    ]);
  });

  it("leaves the missing measure null when only one indicator is present", () => {
    const csv =
      "STRUCTURE,STRUCTURE_ID,freq,reporter,partner,product,flow,indicators,TIME_PERIOD,OBS_VALUE\n" +
      "dataflow,x,M,EU27_2020,DZ,31021090,1,VALUE_IN_EUROS,2024-01,999\n";
    expect(parseComextCsv(csv)).toEqual([
      {
        cn8ProductCode: "31021090",
        partnerCode: "DZ",
        period: "2024-01",
        quantity100kg: null,
        valueEuros: 999,
      },
    ]);
  });

  it("returns [] for header-only or empty input", () => {
    expect(parseComextCsv("")).toEqual([]);
    expect(
      parseComextCsv(
        "STRUCTURE,STRUCTURE_ID,freq,reporter,partner,product,flow,indicators,TIME_PERIOD,OBS_VALUE\n",
      ),
    ).toEqual([]);
  });

  it("ignores an unrecognised indicators value", () => {
    const csv =
      "STRUCTURE,STRUCTURE_ID,freq,reporter,partner,product,flow,indicators,TIME_PERIOD,OBS_VALUE\n" +
      "dataflow,x,M,EU27_2020,RU,28141000,1,SUPPLEMENTARY_QUANTITY,2023-01,7\n";
    expect(parseComextCsv(csv)).toEqual([]);
  });
});
