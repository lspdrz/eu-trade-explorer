import { describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { rawComextImports } from "@/lib/db/schemas/rawComextImports";
import type { ComextObservation } from "../../../types";
import { replaceComextObservations } from "../replaceComextObservations";

function obs(o: Partial<ComextObservation>): ComextObservation {
  return {
    cn8ProductCode: "28141000",
    partnerCode: "RU",
    period: "2024-01",
    quantity100kg: 100,
    valueEuros: 200,
    ...o,
  };
}

const stored = () => db.select().from(rawComextImports);

describe("replaceComextObservations", () => {
  it("replaces only its own heading's rows within the given periods, leaving the rest", async () => {
    await replaceComextObservations({
      heading: "2814",
      periods: ["2024-01"],
      observations: [obs({ cn8ProductCode: "28141000", period: "2024-01", valueEuros: 1 })],
    });
    await replaceComextObservations({
      heading: "3102",
      periods: ["2024-01"],
      observations: [obs({ cn8ProductCode: "31021090", period: "2024-01", valueEuros: 2 })],
    });
    await replaceComextObservations({
      heading: "2814",
      periods: ["2023-12"],
      observations: [obs({ cn8ProductCode: "28141000", period: "2023-12", valueEuros: 3 })],
    });

    // replace 2814 for 2024-01 only
    await replaceComextObservations({
      heading: "2814",
      periods: ["2024-01"],
      observations: [obs({ cn8ProductCode: "28141000", period: "2024-01", valueEuros: 99 })],
    });

    const vals = (await stored()).map((r) => Number(r.valueEuros)).sort((a, b) => a - b);
    // 3102/2024-01 kept, 2814/2023-12 kept, 2814/2024-01 replaced
    expect(vals).toEqual([2, 3, 99]);
  });

  it("round-trips null measures and inserts across multiple batches", async () => {
    const many = Array.from({ length: 501 }, (_, i) =>
      obs({
        cn8ProductCode: "28141000",
        period: i % 2 === 0 ? "2024-01" : "2024-02",
        quantity100kg: i,
        valueEuros: null,
      }),
    );

    const { rowsWritten } = await replaceComextObservations({
      heading: "2814",
      periods: ["2024-01", "2024-02"],
      observations: many,
    });

    expect(rowsWritten).toBe(501);
    const rows = await stored();
    expect(rows).toHaveLength(501);
    expect(rows.every((r) => r.valueEuros === null)).toBe(true);
  });
});
