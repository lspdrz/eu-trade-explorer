import { describe, expect, it } from "vitest";
import type { PartnerImportTotal } from "@/features/globe/types";
import { buildGlobeSummary } from "@/features/globe/lib/globeSummary";

const t = (
  partnerCode: string,
  partner: string,
  tonnes: number,
): PartnerImportTotal => ({ partnerCode, partner, tonnes });
const totals = [
  t("RU", "Russia", 4_200_000),
  t("EG", "Egypt", 2_100_000),
  t("TT", "Trinidad and Tobago", 1_800_000),
  t("DZ", "Algeria", 900_000),
];

describe("buildGlobeSummary", () => {
  it("names the count and the three largest active origins with tonnes", () => {
    const s = buildGlobeSummary(totals, ["RU", "EG", "TT", "DZ"]);
    expect(s).toContain("4 origin countries");
    expect(s).toContain("Russia");
    expect(s).toContain("Egypt");
    expect(s).toContain("Trinidad and Tobago");
    expect(s).not.toContain("Algeria"); // only the top 3 are spoken
    expect(s).toMatch(/drag to rotate/i);
  });

  it("ranks by tonnage among the active set, not by selection order", () => {
    const s = buildGlobeSummary(totals, ["DZ", "RU"]);
    expect(s.indexOf("Russia")).toBeLessThan(s.indexOf("Algeria"));
    expect(s).toContain("2 origin countries");
  });

  it("handles an empty active set", () => {
    expect(buildGlobeSummary(totals, [])).toContain("0 origin countries");
  });

  it("handles empty totals", () => {
    expect(buildGlobeSummary([], [])).toContain("0 origin countries");
  });
});
