import { describe, expect, it } from "vitest";
import type { PartnerImportTotal } from "@/features/globe/types";
import { topN } from "@/features/globe/lib/topN";

const t = (partnerCode: string, tonnes: number): PartnerImportTotal => ({
  partnerCode,
  partner: partnerCode,
  tonnes,
});

describe("topN", () => {
  const totals = [t("RU", 500), t("EG", 300), t("DZ", 200), t("US", 100)];

  it("returns the first n partner codes (input is already tonnes-desc)", () => {
    expect(topN(totals, 2)).toEqual(["RU", "EG"]);
  });

  it("returns all when n exceeds the list", () => {
    expect(topN(totals, 99)).toEqual(["RU", "EG", "DZ", "US"]);
  });

  it("returns [] for n <= 0", () => {
    expect(topN(totals, 0)).toEqual([]);
    expect(topN(totals, -3)).toEqual([]);
  });
});
