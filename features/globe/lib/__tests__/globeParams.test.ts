import { describe, expect, it } from "vitest";
import { parseGlobeCountries, serializeGlobeCountries } from "@/features/globe/lib/globeParams";

const parse = (qs: string) => parseGlobeCountries(new URLSearchParams(qs));

describe("parseGlobeCountries", () => {
  it("splits, upper-cases, trims", () => {
    expect(parse("countries=ru,eg, us")).toEqual(["RU", "EG", "US"]);
  });

  it("drops malformed codes and dedupes", () => {
    expect(parse("countries=RU,RU,USA,,7A,EG")).toEqual(["RU", "EG"]);
  });

  it("caps at 12", () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      String.fromCharCode(65 + i) + "Z",
    ).join(",");
    expect(parse(`countries=${many}`)).toHaveLength(12);
  });

  it("returns [] when absent", () => {
    expect(parse("")).toEqual([]);
  });
});

describe("serializeGlobeCountries", () => {
  it("joins with commas", () => {
    expect(serializeGlobeCountries(["RU", "EG"]).toString()).toBe(
      "countries=RU%2CEG",
    );
  });

  it("omits the param for an empty list", () => {
    expect(serializeGlobeCountries([]).toString()).toBe("");
  });

  it("round-trips", () => {
    const codes = ["RU", "EG", "TT"];
    expect(parseGlobeCountries(serializeGlobeCountries(codes))).toEqual(codes);
  });
});
