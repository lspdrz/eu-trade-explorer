import { describe, expect, it } from "vitest";
import type { ChartSelection, YearlyPartnerTotal } from "../../../types";
import {
  PIVOT_CLEARED,
  deriveBounds,
  deriveYearRange,
  parseSelection,
  serializeSelection,
} from "../chartSelectionParams";

const parse = (q: string) => parseSelection(new URLSearchParams(q));

/** A full, all-defaults ChartSelection. There is no default product. */
const base: ChartSelection = {
  source: "comext",
  view: "countries",
  partnerCodes: [],
  partner: "",
  products: [],
  fromYear: undefined,
  toYear: undefined,
};

describe("parseSelection", () => {
  it("all defaults when the URL is empty", () => {
    expect(parse("")).toEqual(base);
  });

  it("source: surveillance only on an exact match", () => {
    expect(parse("source=surveillance").source).toBe("surveillance");
    expect(parse("source=nonsense").source).toBe("comext");
  });

  it("view: products only on an exact match", () => {
    expect(parse("view=products").view).toBe("products");
    expect(parse("view=nonsense").view).toBe("countries");
  });

  it("countries: upper-cased, deduped, well-formed only, capped at 3", () => {
    expect(parse("countries=us,1,x,USA,eg,us,DZ,MA").partnerCodes).toEqual([
      "US",
      "EG",
      "DZ",
    ]);
  });

  it("partner: a single well-formed code, else empty", () => {
    expect(parse("partner=us").partner).toBe("US");
    expect(parse("partner=USA").partner).toBe("");
    expect(parse("").partner).toBe("");
  });

  it("products: empty when absent, no default on either view", () => {
    expect(parse("").products).toEqual([]);
    expect(parse("view=products").products).toEqual([]);
    expect(parse("products=Ammonia,Urea").products).toEqual(["Ammonia", "Urea"]);
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
    expect(parse("product=Urea").products).toEqual([]);
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
      source: "surveillance",
      view: "products",
      partner: "RU",
      products: ["Ammonia", "Urea"],
      fromYear: 2018,
      toYear: 2022,
    };
    const params = serializeSelection(selection);
    expect(params.get("source")).toBe("surveillance");
    expect(params.get("view")).toBe("products");
    expect(params.get("partner")).toBe("RU");
    expect(params.get("products")).toBe("Ammonia,Urea");
    expect(params.get("from")).toBe("2018");
    expect(params.get("to")).toBe("2022");
    expect(params.has("product")).toBe(false);
    expect(parseSelection(params)).toEqual(selection);
  });

  it("omits an empty products list, emits a non-empty one", () => {
    expect(serializeSelection({ ...base, products: [] }).toString()).toBe("");
    expect(
      serializeSelection({ ...base, products: ["Ammonia", "Urea"] }).get("products"),
    ).toBe("Ammonia,Urea");
  });

  it("a pivot patch serialises to just the pivot param", () => {
    const dirty: ChartSelection = {
      ...base,
      source: "surveillance",
      view: "products",
      partnerCodes: ["EG"],
      partner: "RU",
      products: ["Ammonia", "Urea"],
      fromYear: 2015,
      toYear: 2020,
    };
    // tab switch keeps source, clears the rest
    expect(
      serializeSelection({ ...dirty, ...PIVOT_CLEARED, view: "countries" }).toString(),
    ).toBe("source=surveillance");
    // source switch keeps view, clears the rest
    expect(
      serializeSelection({ ...dirty, ...PIVOT_CLEARED, source: "comext" }).toString(),
    ).toBe("view=products");
  });

  const dirty: ChartSelection = {
    ...base,
    source: "comext",
    view: "products",
    partner: "RU",
    products: ["Ammonia"],
    fromYear: 2018,
  };

  it("a source pivot retains the active tab and clears the rest", () => {
    const after = parseSelection(
      serializeSelection({ ...dirty, ...PIVOT_CLEARED, source: "surveillance" }),
    );
    expect(after.view).toBe("products"); // tab kept
    expect(after.source).toBe("surveillance");
    expect(after).toMatchObject({ partner: "", products: [], fromYear: undefined });
  });

  it("a tab pivot retains the source and clears the rest", () => {
    const after = parseSelection(
      serializeSelection({ ...dirty, ...PIVOT_CLEARED, view: "countries" }),
    );
    expect(after.source).toBe("comext"); // source kept
    expect(after.view).toBe("countries");
    expect(after).toMatchObject({ partner: "", products: [], fromYear: undefined });
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
});
