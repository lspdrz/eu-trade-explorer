import { describe, expect, it, vi } from "vitest";
import type { RawTaxudWeekRow } from "../../types";

vi.mock("../fetchWeeklyImports", () => ({
  fetchWeeklyImports: vi.fn(),
}));
vi.mock("../../db/mutations/replaceProductData", () => ({
  replaceProductData: vi.fn(),
}));

import { fetchWeeklyImports } from "../fetchWeeklyImports";
import { replaceProductData } from "../../db/mutations/replaceProductData";
import { runFertilizerSync } from "../runFertilizerSync";

// The EU API split "Nitrogenous fertilisers" into these six, confirmed live
// (2026-09-07) via the authoritative products endpoint and by cross-
// checking every historical CN8 code that used to be tagged "Nitrogenous
// fertilisers" against what it maps to today — all 14 codes land on
// exactly these six, no leakage into any other category.
const NITROGEN_SUB_PRODUCTS = [
  "AN - Ammonium nitrate",
  "AS - Ammonium sulphate",
  "CAN - Calcium Ammonium Nitrate",
  "UAN - Urea Ammonium nitrate",
  "Urea",
  "Nitrogenous fertilisers - other",
];
const ALL_PRODUCTS = ["Ammonia", ...NITROGEN_SUB_PRODUCTS];

function row(product: string): RawTaxudWeekRow {
  return {
    sector: "Fertilisers",
    marketingYear: "2023",
    week: 1,
    memberStateCode: "FI",
    memberStateName: "Finland",
    partnerCode: "RU",
    partner: "Russia",
    product,
    cn8ProductCode: "28141000",
    taric10ProductCode: "2814100000",
    procedure: 4000,
    preference: 100,
    euroValue: "0",
    unitValue: "0",
    kg: "0",
    kgEquivalent: "0",
    coefficient: "1",
  };
}

// A non-empty source, distinct per product, so tests can tell which
// product's fetch a given replaceProductData call actually received.
function oneRowSource(product: string): AsyncGenerator<RawTaxudWeekRow> {
  return (async function* () {
    yield row(product);
  })();
}

async function* emptySource() {
  // yields nothing — used to exercise the skip path
}

describe("runFertilizerSync", () => {
  it("defaults to fetching and replacing just the current marketingYear for every hardcoded product", async () => {
    vi.mocked(fetchWeeklyImports).mockImplementation(({ product }) => oneRowSource(product));
    vi.mocked(replaceProductData).mockResolvedValue({ rowsWritten: 1 });
    const currentYear = String(new Date().getFullYear());

    await runFertilizerSync(null);

    for (const product of ALL_PRODUCTS) {
      expect(fetchWeeklyImports).toHaveBeenCalledWith({ product, marketingYears: [currentYear] });
      expect(replaceProductData).toHaveBeenCalledWith(
        expect.objectContaining({ product, marketingYear: currentYear }),
      );
    }
  });

  it("treats any mode other than 'backfill' the same as no mode", async () => {
    vi.mocked(fetchWeeklyImports).mockImplementation(({ product }) => oneRowSource(product));
    vi.mocked(replaceProductData).mockResolvedValue({ rowsWritten: 1 });
    const currentYear = String(new Date().getFullYear());

    await runFertilizerSync("not-a-real-mode");

    expect(fetchWeeklyImports).toHaveBeenCalledWith(
      expect.objectContaining({ marketingYears: [currentYear] }),
    );
    expect(replaceProductData).toHaveBeenCalledWith(
      expect.objectContaining({ marketingYear: currentYear }),
    );
  });

  it("mode 'backfill' fetches and replaces full history (no marketingYears) for every hardcoded product", async () => {
    vi.mocked(fetchWeeklyImports).mockImplementation(({ product }) => oneRowSource(product));
    vi.mocked(replaceProductData).mockResolvedValue({ rowsWritten: 1 });

    await runFertilizerSync("backfill");

    for (const product of ALL_PRODUCTS) {
      expect(fetchWeeklyImports).toHaveBeenCalledWith({ product, marketingYears: undefined });
      expect(replaceProductData).toHaveBeenCalledWith(
        expect.objectContaining({ product, marketingYear: undefined }),
      );
    }
  });

  it("passes each product's real fetched rows through to replaceProductData, peeked-and-combined", async () => {
    vi.mocked(fetchWeeklyImports).mockImplementation(({ product }) => oneRowSource(product));
    vi.mocked(replaceProductData).mockResolvedValue({ rowsWritten: 1 });

    await runFertilizerSync(null);

    for (const product of ALL_PRODUCTS) {
      const call = vi
        .mocked(replaceProductData)
        .mock.calls.find(([args]) => args.product === product);
      expect(call).toBeDefined();

      const collected: RawTaxudWeekRow[] = [];
      for await (const r of call![0].source) collected.push(r);
      expect(collected).toEqual([row(product)]);
    }
  });

  it("skips a product whose fetch yields nothing, without calling replaceProductData", async () => {
    vi.mocked(fetchWeeklyImports).mockImplementation(({ product }) =>
      product === "Urea" ? emptySource() : oneRowSource(product),
    );
    vi.mocked(replaceProductData).mockResolvedValue({ rowsWritten: 1 });

    const results = await runFertilizerSync(null);

    expect(results.Urea).toEqual({ rowsWritten: 0, skipped: true });
    expect(replaceProductData).not.toHaveBeenCalledWith(
      expect.objectContaining({ product: "Urea" }),
    );
    // Other products are unaffected by Urea's empty fetch.
    expect(results.Ammonia).toEqual({ rowsWritten: 1, skipped: false });
  });

  it("does not merge the six nitrogen sub-products into one result — each is synced and reported separately", async () => {
    // Sync stores a faithful mirror of whatever the API reports as its own
    // product — no relabeling or merging at sync time. Any combined view
    // across these six is read-time aggregation, not built yet.
    vi.mocked(fetchWeeklyImports).mockImplementation(({ product }) => oneRowSource(product));
    vi.mocked(replaceProductData).mockResolvedValue({ rowsWritten: 1 });

    const results = await runFertilizerSync(null);

    expect(Object.keys(results).sort()).toEqual([...ALL_PRODUCTS].sort());
  });

  it("returns each product's rowsWritten keyed by product name, skipped: false for a real write", async () => {
    vi.mocked(fetchWeeklyImports).mockImplementation(({ product }) => oneRowSource(product));
    vi.mocked(replaceProductData).mockImplementation(async ({ product }) =>
      product === "Ammonia" ? { rowsWritten: 42 } : { rowsWritten: 7 },
    );

    const results = await runFertilizerSync(null);

    expect(results.Ammonia).toEqual({ rowsWritten: 42, skipped: false });
    expect(results["Urea"]).toEqual({ rowsWritten: 7, skipped: false });
  });
});
