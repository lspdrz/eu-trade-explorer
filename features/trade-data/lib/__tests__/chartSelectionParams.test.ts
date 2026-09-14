import { describe, expect, it } from "vitest";
import type { ChartSelection, YearlyPartnerTotal } from "@/features/trade-data/types";
import {
  DEFAULT_PARTNER,
  DEFAULT_PARTNER_CODES,
  DEFAULT_PRODUCTS,
  PIVOT_CLEARED,
  deriveBounds,
  deriveYearRange,
  parseSelection,
  serializeSelection,
} from "@/features/trade-data/lib/chartSelectionParams";

const parse = (q: string) => parseSelection(new URLSearchParams(q));

/** A full, all-defaults ChartSelection: Ammonia + Russia on both tabs. */
const base: ChartSelection = {
  view: "countries",
  partnerCodes: DEFAULT_PARTNER_CODES,
  partner: DEFAULT_PARTNER,
  products: DEFAULT_PRODUCTS,
  fromYear: undefined,
  toYear: undefined,
};

describe("parseSelection", () => {
  it("all defaults when the URL is empty", () => {
    expect(parse("")).toEqual(base);
  });

  it("view: products only on an exact match", () => {
    expect(parse("view=products").view).toBe("products");
    expect(parse("view=nonsense").view).toBe("countries");
  });

  it("countries: defaults to Russia when absent, else upper-cased/deduped/well-formed/capped at 2", () => {
    expect(parse("").partnerCodes).toEqual(["RU"]);
    expect(parse("countries=us,1,x,USA,eg,us,DZ,MA").partnerCodes).toEqual([
      "US",
      "EG",
    ]);
  });

  it("countries: an explicit empty value stays empty, not defaulted", () => {
    expect(parse("countries=").partnerCodes).toEqual([]);
  });

  it("partner: defaults to Russia when absent, else a single well-formed code or empty", () => {
    expect(parse("").partner).toBe("RU");
    expect(parse("partner=us").partner).toBe("US");
    expect(parse("partner=USA").partner).toBe("");
  });

  it("partner: an explicit empty/invalid value stays empty, not defaulted", () => {
    expect(parse("partner=").partner).toBe("");
    expect(parse("partner=USA").partner).toBe("");
  });

  it("products: defaults to Ammonia when absent, on either tab", () => {
    expect(parse("").products).toEqual(["Ammonia"]);
    expect(parse("view=products").products).toEqual(["Ammonia"]);
  });

  it("products: an explicit empty value stays empty, not defaulted", () => {
    expect(parse("products=").products).toEqual([]);
  });

  it("products: trimmed, deduped, capped at 3 (no validation)", () => {
    expect(parse("products=Ammonia,Ammonia,Urea,Nope,Extra").products).toEqual([
      "Ammonia",
      "Urea",
      "Nope",
    ]);
  });

  it("ignores a legacy ?product= param", () => {
    expect(parse("product=Urea")).not.toHaveProperty("product");
    expect(parse("product=Urea").products).toEqual(["Ammonia"]); // absent -> default
  });

  it("years: the number the URL asked for, or undefined", () => {
    expect(parse("from=2015&to=2020")).toMatchObject({ fromYear: 2015, toYear: 2020 });
    expect(parse("from=abc")).toMatchObject({ fromYear: undefined });
    expect(parse("")).toMatchObject({ fromYear: undefined, toYear: undefined });
  });
});

describe("serializeSelection", () => {
  it("omits everything at its default", () => {
    expect(serializeSelection(base).toString()).toBe("");
  });

  it("emits only non-defaults, and round-trips", () => {
    const selection: ChartSelection = {
      ...base,
      view: "products",
      partner: "EG",
      products: ["Ammonia", "Urea"],
      fromYear: 2018,
      toYear: 2022,
    };
    const params = serializeSelection(selection);
    expect(params.get("view")).toBe("products");
    expect(params.get("partner")).toBe("EG");
    expect(params.get("products")).toBe("Ammonia,Urea");
    expect(params.get("from")).toBe("2018");
    expect(params.get("to")).toBe("2022");
    expect(params.has("product")).toBe(false);
    expect(parseSelection(params)).toEqual(selection);
  });

  it("an explicitly empty products list is emitted (differs from default), and round-trips", () => {
    const cleared = { ...base, products: [] };
    const params = serializeSelection(cleared);
    expect(params.get("products")).toBe("");
    expect(parseSelection(params).products).toEqual([]);
  });

  it("omits a products list matching the default, emits a different one", () => {
    expect(serializeSelection({ ...base, products: ["Ammonia"] }).toString()).toBe("");
    expect(
      serializeSelection({ ...base, products: ["Ammonia", "Urea"] }).get("products"),
    ).toBe("Ammonia,Urea");
  });

  it("a pivot patch serialises to just the pivot param", () => {
    const dirty: ChartSelection = {
      ...base,
      partnerCodes: ["EG"],
      partner: "FR",
      products: ["Ammonia", "Urea"],
      fromYear: 2015,
      toYear: 2020,
    };
    // tab switch resets everything else to its default, leaving only the new tab
    expect(
      serializeSelection({ ...dirty, ...PIVOT_CLEARED, view: "products" }).toString(),
    ).toBe("view=products");
  });

  const dirty: ChartSelection = {
    ...base,
    view: "products",
    partner: "FR",
    products: ["Urea"],
    fromYear: 2018,
  };

  it("a tab pivot resets product/partner/year to their defaults", () => {
    const after = parseSelection(
      serializeSelection({ ...dirty, ...PIVOT_CLEARED, view: "countries" }),
    );
    expect(after.view).toBe("countries");
    expect(after).toMatchObject({
      partner: DEFAULT_PARTNER,
      products: DEFAULT_PRODUCTS,
      fromYear: undefined,
    });
  });
});

describe("deriveBounds", () => {
  it("extracts name-sorted distinct partners and ascending distinct years", () => {
    const totals: YearlyPartnerTotal[] = [
      { year: "2021", partnerCode: "US", partner: "United States", tonnes: 1 },
      { year: "2019", partnerCode: "EG", partner: "Egypt", tonnes: 1 },
      { year: "2021", partnerCode: "EG", partner: "Egypt", tonnes: 1 },
    ];
    expect(deriveBounds(totals)).toEqual({
      partners: [
        { code: "EG", name: "Egypt" },
        { code: "US", name: "United States" },
      ],
      years: [2019, 2021],
    });
  });
});

describe("deriveYearRange", () => {
  const years = [2015, 2016, 2017, 2018, 2019, 2020];

  it("defaults to the full span", () => {
    expect(deriveYearRange({ fromYear: undefined, toYear: undefined }, years)).toEqual({
      fromYear: 2015,
      toYear: 2020,
    });
  });

  it("clamps to the span", () => {
    expect(deriveYearRange({ fromYear: 1990, toYear: 3000 }, years)).toEqual({
      fromYear: 2015,
      toYear: 2020,
    });
  });

  it("swaps a crossed range", () => {
    expect(deriveYearRange({ fromYear: 2019, toYear: 2016 }, years)).toEqual({
      fromYear: 2016,
      toYear: 2019,
    });
  });

  it("is [0, 0] with no years", () => {
    expect(deriveYearRange({ fromYear: 2015, toYear: 2020 }, [])).toEqual({
      fromYear: 0,
      toYear: 0,
    });
  });

  it("maxSpan trims an over-wide span from the start, keeping toYear", () => {
    expect(
      deriveYearRange({ fromYear: undefined, toYear: undefined }, years, 3),
    ).toEqual({ fromYear: 2017, toYear: 2020 }); // full 2015-2020 span trimmed to 3
    expect(deriveYearRange({ fromYear: 2015, toYear: 2018 }, years, 3)).toEqual({
      fromYear: 2015,
      toYear: 2018,
    }); // already within maxSpan — untouched
  });

  it("maxSpan is a no-op when omitted or already satisfied", () => {
    expect(deriveYearRange({ fromYear: 2016, toYear: 2018 }, years)).toEqual({
      fromYear: 2016,
      toYear: 2018,
    });
  });
});
