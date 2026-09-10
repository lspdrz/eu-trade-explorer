import { describe, expect, it } from "vitest";
import type { PartnerImportTotal } from "@/features/globe/types";
import { resolveActive, toggleCountry } from "@/features/globe/lib/resolveActive";

const t = (partnerCode: string, tonnes: number): PartnerImportTotal => ({
  partnerCode,
  partner: partnerCode,
  tonnes,
});
const totals = [
  t("RU", 100), t("EG", 90), t("DZ", 80), t("US", 70), t("TT", 60),
  t("CA", 50), t("MA", 40), t("NO", 30), t("SA", 20), t("OM", 10), t("BH", 5),
];

describe("resolveActive", () => {
  it("empty request → the top DEFAULT_TOP_N (10) codes", () => {
    expect(resolveActive(totals, [])).toEqual([
      "RU", "EG", "DZ", "US", "TT", "CA", "MA", "NO", "SA", "OM",
    ]);
  });

  it("non-empty request → exactly that set, order preserved", () => {
    expect(resolveActive(totals, ["EG", "RU"])).toEqual(["EG", "RU"]);
  });

  it("drops requested codes not present in totals", () => {
    expect(resolveActive(totals, ["EG", "ZZ", "RU"])).toEqual(["EG", "RU"]);
  });

  it("caps a long request at MAX_GLOBE_COUNTRIES (12)", () => {
    const req = totals.map((x) => x.partnerCode); // 11 — under the cap
    expect(resolveActive(totals, req)).toHaveLength(11);
  });
});

describe("toggleCountry", () => {
  it("adds a code that is absent", () => {
    expect(toggleCountry(["RU"], "EG")).toEqual(["RU", "EG"]);
  });

  it("removes a code that is present", () => {
    expect(toggleCountry(["RU", "EG"], "RU")).toEqual(["EG"]);
  });

  it("does not add past the cap", () => {
    const twelve = Array.from({ length: 12 }, (_, i) => `A${i}`);
    expect(toggleCountry(twelve, "NEW")).toEqual(twelve);
  });
});
