import { describe, expect, it } from "vitest";
import type { YearlyPartnerTotal } from "../../../types";
import {
  DEFAULT_PRODUCT,
  chartSelectionToParams,
  deriveBounds,
  parseChartSelection,
} from "../chartSelectionParams";

const bounds = {
  products: ["Ammonia", "Urea"],
  partners: [
    { code: "DZ", name: "Algeria" },
    { code: "EG", name: "Egypt" },
    { code: "US", name: "United States" },
  ],
  years: [2018, 2019, 2020, 2021],
};

/** A full, all-defaults ChartSelection for this `bounds`. */
const base = {
  source: "comext" as const,
  view: "countries" as const,
  product: DEFAULT_PRODUCT,
  partnerCodes: [] as string[],
  partner: "",
  products: [] as string[],
  fromYear: 2018,
  toYear: 2021,
};

describe("deriveBounds", () => {
  it("extracts sorted distinct years and name-sorted distinct partners from the dataset", () => {
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

describe("parseChartSelection", () => {
  it("applies defaults when params are absent", () => {
    expect(parseChartSelection(new URLSearchParams(""), bounds)).toEqual(base);
  });

  it("falls back to the default product for an unknown product", () => {
    expect(
      parseChartSelection(new URLSearchParams("product=Nonsense"), bounds).product,
    ).toBe(DEFAULT_PRODUCT);
  });

  it("keeps a known product", () => {
    expect(
      parseChartSelection(new URLSearchParams("product=Urea"), bounds).product,
    ).toBe("Urea");
  });

  it("drops malformed country codes and dedupes, preserving order", () => {
    expect(
      parseChartSelection(new URLSearchParams("countries=US,1,x,USA,EG,us"), bounds)
        .partnerCodes,
    ).toEqual(["US", "EG"]);
  });

  it("keeps a well-formed code with no data for the current product (renders as a zero bar)", () => {
    expect(
      parseChartSelection(new URLSearchParams("countries=MA,US"), bounds).partnerCodes,
    ).toEqual(["MA", "US"]);
  });

  it("upper-cases country codes", () => {
    expect(
      parseChartSelection(new URLSearchParams("countries=eg,us"), bounds).partnerCodes,
    ).toEqual(["EG", "US"]);
  });

  it("truncates to MAX_COUNTRIES", () => {
    expect(
      parseChartSelection(new URLSearchParams("countries=US,EG,DZ,US"), bounds)
        .partnerCodes,
    ).toEqual(["US", "EG", "DZ"]);
  });

  it("clamps years to the available span", () => {
    expect(
      parseChartSelection(new URLSearchParams("from=1990&to=3000"), bounds),
    ).toMatchObject({ fromYear: 2018, toYear: 2021 });
  });

  it("swaps a crossed range", () => {
    expect(
      parseChartSelection(new URLSearchParams("from=2020&to=2018"), bounds),
    ).toMatchObject({ fromYear: 2018, toYear: 2020 });
  });

  it("ignores non-numeric years", () => {
    expect(
      parseChartSelection(new URLSearchParams("from=abc"), bounds),
    ).toMatchObject({ fromYear: 2018, toYear: 2021 });
  });
});

describe("chartSelectionToParams", () => {
  it("omits params that equal their default", () => {
    expect(chartSelectionToParams(base, bounds).toString()).toBe("");
  });

  it("serialises a full selection", () => {
    const params = chartSelectionToParams(
      { ...base, product: "Urea", partnerCodes: ["US", "EG"], fromYear: 2019, toYear: 2020 },
      bounds,
    );
    expect(params.get("product")).toBe("Urea");
    expect(params.get("countries")).toBe("US,EG");
    expect(params.get("from")).toBe("2019");
    expect(params.get("to")).toBe("2020");
  });

  it("round-trips through parseChartSelection", () => {
    const selection = {
      ...base,
      product: "Urea",
      partnerCodes: ["EG", "US"],
      fromYear: 2019,
      toYear: 2021,
    };
    expect(parseChartSelection(chartSelectionToParams(selection, bounds), bounds)).toEqual(
      selection,
    );
  });
});

describe("source", () => {
  it("defaults to comext when the param is absent or unknown", () => {
    expect(parseChartSelection(new URLSearchParams(""), bounds).source).toBe("comext");
    expect(
      parseChartSelection(new URLSearchParams("source=nonsense"), bounds).source,
    ).toBe("comext");
  });

  it("reads an explicit surveillance value", () => {
    expect(
      parseChartSelection(new URLSearchParams("source=surveillance"), bounds).source,
    ).toBe("surveillance");
  });

  it("omits source when default, emits when non-default", () => {
    expect(chartSelectionToParams(base, bounds).has("source")).toBe(false);
    expect(
      chartSelectionToParams({ ...base, source: "surveillance" }, bounds).get("source"),
    ).toBe("surveillance");
  });

  it("round-trips a surveillance selection", () => {
    const selection = { ...base, source: "surveillance" as const, partnerCodes: ["EG"] };
    expect(parseChartSelection(chartSelectionToParams(selection, bounds), bounds)).toEqual(
      selection,
    );
  });
});

describe("view", () => {
  it("defaults to countries; reads products; unknown -> countries", () => {
    expect(parseChartSelection(new URLSearchParams(""), bounds).view).toBe("countries");
    expect(
      parseChartSelection(new URLSearchParams("view=products"), bounds).view,
    ).toBe("products");
    expect(
      parseChartSelection(new URLSearchParams("view=nonsense"), bounds).view,
    ).toBe("countries");
  });

  it("omits view when countries, emits when products", () => {
    expect(chartSelectionToParams(base, bounds).has("view")).toBe(false);
    expect(
      chartSelectionToParams({ ...base, view: "products" }, bounds).get("view"),
    ).toBe("products");
  });
});

describe("partner + products (compare-products tab)", () => {
  it("partner: keeps a known code (upper-cased), else empty", () => {
    expect(parseChartSelection(new URLSearchParams("partner=us"), bounds).partner).toBe("US");
    expect(parseChartSelection(new URLSearchParams("partner=ZZ"), bounds).partner).toBe("");
    expect(parseChartSelection(new URLSearchParams(""), bounds).partner).toBe("");
  });

  it("products: known values only, deduped, capped at MAX_PRODUCTS", () => {
    expect(
      parseChartSelection(new URLSearchParams("products=Ammonia,Ammonia,Urea,Nope"), bounds)
        .products,
    ).toEqual(["Ammonia", "Urea"]);
    expect(parseChartSelection(new URLSearchParams(""), bounds).products).toEqual([]);
  });

  it("round-trips a products-tab selection", () => {
    const selection = {
      ...base,
      view: "products" as const,
      partner: "US",
      products: ["Ammonia", "Urea"],
    };
    expect(parseChartSelection(chartSelectionToParams(selection, bounds), bounds)).toEqual(
      selection,
    );
  });
});
