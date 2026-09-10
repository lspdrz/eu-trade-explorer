import { describe, expect, it } from "vitest";
import { topN } from "@/features/globe/utils/topN";

describe("topN", () => {
  const list = ["a", "b", "c", "d"];

  it("returns the first n items", () => {
    expect(topN(list, 2)).toEqual(["a", "b"]);
  });

  it("returns all when n exceeds the length", () => {
    expect(topN(list, 99)).toEqual(["a", "b", "c", "d"]);
  });

  it("returns [] for n <= 0", () => {
    expect(topN(list, 0)).toEqual([]);
    expect(topN(list, -3)).toEqual([]);
  });
});
