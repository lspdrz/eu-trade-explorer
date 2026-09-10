import { describe, expect, it } from "vitest";
import { peekFirst } from "@/features/sync-eu-agrifood/utils/peekFirst";

async function* asyncFrom<T>(items: T[]): AsyncGenerator<T> {
  for (const item of items) {
    yield item;
  }
}

describe("peekFirst", () => {
  it("reports empty for a source that yields nothing", async () => {
    const result = await peekFirst(asyncFrom<number>([]));
    expect(result).toEqual({ empty: true });
  });

  it("reports not empty and replays every original item, in order, from the combined generator", async () => {
    const result = await peekFirst(asyncFrom([1, 2, 3]));
    expect(result.empty).toBe(false);
    if (result.empty) throw new Error("unreachable");

    const collected: number[] = [];
    for await (const item of result.combined) {
      collected.push(item);
    }
    expect(collected).toEqual([1, 2, 3]);
  });

  it("pulls only one item from the source before resolving, not the whole stream", async () => {
    let pulls = 0;
    async function* tracked() {
      for (const item of [1, 2, 3]) {
        pulls++;
        yield item;
      }
    }

    await peekFirst(tracked());

    expect(pulls).toBe(1);
  });

  it("propagates an error thrown on the very first pull", async () => {
    async function* throwsImmediately(): AsyncGenerator<number> {
      throw new Error("boom");
    }

    await expect(peekFirst(throwsImmediately())).rejects.toThrow("boom");
  });
});
