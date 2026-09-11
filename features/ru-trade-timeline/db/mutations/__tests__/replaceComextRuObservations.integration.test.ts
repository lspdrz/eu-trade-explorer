import { describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { rawComextRuImports } from "@/lib/db/schemas/rawComextRuImports";
import type { ComextRuObservation } from "@/features/ru-trade-timeline/types";
import { replaceComextRuObservations } from "@/features/ru-trade-timeline/db/mutations/replaceComextRuObservations";

function obs(o: Partial<ComextRuObservation>): ComextRuObservation {
  return {
    cn8ProductCode: "28141000",
    period: "2024-01",
    quantity100kg: 100,
    valueEuros: 200,
    ...o,
  };
}

const stored = () => db.select().from(rawComextRuImports);

describe("replaceComextRuObservations", () => {
  it("replaces only rows for the given CN8 codes, leaving other codes' rows alone", async () => {
    await replaceComextRuObservations({
      cn8ProductCodes: ["28141000"],
      observations: [obs({ cn8ProductCode: "28141000", valueEuros: 1 })],
    });
    await replaceComextRuObservations({
      cn8ProductCodes: ["85423100"],
      observations: [obs({ cn8ProductCode: "85423100", valueEuros: 2 })],
    });

    // re-writing 28141000 must not touch 85423100's row
    await replaceComextRuObservations({
      cn8ProductCodes: ["28141000"],
      observations: [obs({ cn8ProductCode: "28141000", valueEuros: 99 })],
    });

    const vals = (await stored()).map((r) => Number(r.valueEuros)).sort((a, b) => a - b);
    expect(vals).toEqual([2, 99]);
  });

  it("always writes partnerCode RU regardless of input", async () => {
    await replaceComextRuObservations({
      cn8ProductCodes: ["28141000"],
      observations: [obs({ cn8ProductCode: "28141000" })],
    });
    const rows = await stored();
    expect(rows).toHaveLength(1);
    expect(rows[0].partnerCode).toBe("RU");
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

    const { rowsWritten } = await replaceComextRuObservations({
      cn8ProductCodes: ["28141000"],
      observations: many,
    });

    expect(rowsWritten).toBe(501);
    const rows = await stored();
    expect(rows).toHaveLength(501);
    expect(rows.every((r) => r.valueEuros === null)).toBe(true);
  });
});
