import { describe, expect, it } from "vitest";
import { filterCountries } from "@/features/trade-data/lib/filterCountries";

const partners = [
  { code: "CI", name: "Côte d’Ivoire" },
  { code: "EG", name: "Egypt" },
  { code: "US", name: "United States" },
];

describe("filterCountries", () => {
  it("returns all partners for an empty or whitespace query", () => {
    expect(filterCountries(partners, "")).toEqual(partners);
    expect(filterCountries(partners, "   ")).toEqual(partners);
  });

  it("matches case-insensitively on name", () => {
    expect(filterCountries(partners, "egy")).toEqual([{ code: "EG", name: "Egypt" }]);
  });

  it("matches diacritic-insensitively", () => {
    expect(filterCountries(partners, "cote")).toEqual([
      { code: "CI", name: "Côte d’Ivoire" },
    ]);
  });

  it("matches on country code", () => {
    expect(filterCountries(partners, "us")).toEqual([
      { code: "US", name: "United States" },
    ]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(filterCountries(partners, "zzz")).toEqual([]);
  });
});
