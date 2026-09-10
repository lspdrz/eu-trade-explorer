import { describe, expect, it } from "vitest";
import { batchesOf } from "@/features/sync-eu-agrifood/utils/batch";

async function* asyncFrom<T>(items: T[]): AsyncGenerator<T> {
  for (const item of items) {
    yield item;
  }
}

describe("batchesOf", () => {
  it("groups items into batches of the given size", async () => {
    const batches: number[][] = [];
    for await (const batch of batchesOf(asyncFrom([1, 2, 3, 4, 5]), 2)) {
      batches.push(batch);
    }
    expect(batches).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("yields nothing for an empty source", async () => {
    const batches: number[][] = [];
    for await (const batch of batchesOf(asyncFrom<number>([]), 2)) {
      batches.push(batch);
    }
    expect(batches).toEqual([]);
  });

  it("yields one batch when size exceeds the item count", async () => {
    const batches: number[][] = [];
    for await (const batch of batchesOf(asyncFrom([1, 2]), 10)) {
      batches.push(batch);
    }
    expect(batches).toEqual([[1, 2]]);
  });

  it("yields one full batch per exact multiple, no trailing empty batch", async () => {
    const batches: number[][] = [];
    for await (const batch of batchesOf(asyncFrom([1, 2, 3, 4]), 2)) {
      batches.push(batch);
    }
    expect(batches).toEqual([[1, 2], [3, 4]]);
  });
});
