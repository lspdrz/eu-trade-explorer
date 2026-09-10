import { describe, expect, it } from "vitest";
import { COMEXT_PRODUCT_HEADINGS, COMEXT_PRODUCTS } from "../comextProducts";

describe("comextProducts", () => {
  it("maps each product to its HS heading", () => {
    expect(COMEXT_PRODUCT_HEADINGS).toEqual({
      Ammonia: "2814",
      "Nitrogenous fertilisers": "3102",
    });
  });

  it("lists the products in display order, Ammonia first", () => {
    expect(COMEXT_PRODUCTS).toEqual(["Ammonia", "Nitrogenous fertilisers"]);
  });
});
