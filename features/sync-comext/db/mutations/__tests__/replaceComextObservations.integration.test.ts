import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { rawComextImports } from "@/lib/db/schemas/rawComextImports";
import type { ComextObservation } from "../../../types";
import { replaceComextObservations } from "../replaceComextObservations";

// Sentinel partner code so these tests never touch real synced data.
const P = "__test__";

function obs(o: Partial<ComextObservation>): ComextObservation {
  return {
    cn8ProductCode: "28141000",
    partnerCode: P,
    period: "2024-01",
    quantity100kg: 100,
    valueEuros: 200,
    ...o,
  };
}

async function stored() {
  return db
    .select()
    .from(rawComextImports)
    .where(sql`${rawComextImports.partnerCode} = ${P}`);
}

describe("replaceComextObservations", () => {
  afterEach(async () => {
    await db.delete(rawComextImports).where(sql`${rawComextImports.partnerCode} = ${P}`);
  });

  it("deletes only its own heading's rows within the given periods, then inserts", async () => {
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

    // replace 2814 for 2024-01
    await replaceComextObservations({
      heading: "2814",
      periods: ["2024-01"],
      observations: [obs({ cn8ProductCode: "28141000", period: "2024-01", valueEuros: 99 })],
    });

    const vals = (await stored()).map((r) => Number(r.valueEuros)).sort((a, b) => a - b);
    expect(vals).toEqual([2, 3, 99]); // 3102/2024-01 kept, 2814/2023-12 kept, 2814/2024-01 replaced
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
