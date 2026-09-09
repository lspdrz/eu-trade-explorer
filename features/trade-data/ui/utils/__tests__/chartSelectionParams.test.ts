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
    expect(parseChartSelection(new URLSearchParams(""), bounds)).toEqual({
      source: "comext",
      product: DEFAULT_PRODUCT,
      partnerCodes: [],
      fromYear: 2018,
      toYear: 2021,
    });
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
    // "MA" isn't in this product's partner list but is a valid 2-letter code.
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
    const params = chartSelectionToParams(
      { source: "comext", product: DEFAULT_PRODUCT, partnerCodes: [], fromYear: 2018, toYear: 2021 },
      bounds,
    );
    expect(params.toString()).toBe("");
  });

  it("serialises a full selection", () => {
    const params = chartSelectionToParams(
      { source: "comext", product: "Urea", partnerCodes: ["US", "EG"], fromYear: 2019, toYear: 2020 },
      bounds,
    );
    expect(params.get("product")).toBe("Urea");
    expect(params.get("countries")).toBe("US,EG");
    expect(params.get("from")).toBe("2019");
    expect(params.get("to")).toBe("2020");
  });

  it("round-trips through parseChartSelection", () => {
    const selection = {
      source: "comext" as const,
      product: "Urea",
      partnerCodes: ["EG", "US"],
      fromYear: 2019,
      toYear: 2021,
    };
    const params = chartSelectionToParams(selection, bounds);
    expect(parseChartSelection(params, bounds)).toEqual(selection);
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

  it("omits source from params when it is the default", () => {
    const params = chartSelectionToParams(
      { source: "comext", product: DEFAULT_PRODUCT, partnerCodes: [], fromYear: 2018, toYear: 2021 },
      bounds,
    );
    expect(params.has("source")).toBe(false);
  });

  it("emits source only when non-default", () => {
    const params = chartSelectionToParams(
      {
        source: "surveillance",
        product: DEFAULT_PRODUCT,
        partnerCodes: [],
        fromYear: 2018,
        toYear: 2021,
      },
      bounds,
    );
    expect(params.get("source")).toBe("surveillance");
  });

  it("round-trips a surveillance selection", () => {
    const selection = {
      source: "surveillance" as const,
      product: "Urea",
      partnerCodes: ["EG"],
      fromYear: 2019,
      toYear: 2021,
    };
    expect(parseChartSelection(chartSelectionToParams(selection, bounds), bounds)).toEqual(
      selection,
    );
  });
});
