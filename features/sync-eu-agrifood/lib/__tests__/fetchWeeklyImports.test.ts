import { Response } from "undici";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/eu-agrifood-api/client", () => ({
  contactEUAPI: vi.fn(),
}));

import { contactEUAPI } from "@/lib/eu-agrifood-api/client";
import { fetchWeeklyImports } from "../fetchWeeklyImports";

// contactEUAPI's inferred return type is undici's own Response (it calls
// undici's fetch, not the global one — see client.ts's doc comment), so
// the fake here must be undici's Response too, not the global DOM one —
// they're structurally different types despite the same name.
function jsonResponse(status: number, jsonText?: string): Response {
  const body = jsonText
    ? new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(jsonText));
          controller.close();
        },
      })
    : null;
  return new Response(body, { status });
}

async function collect<T>(gen: AsyncGenerator<T>): Promise<T[]> {
  const items: T[] = [];
  for await (const item of gen) items.push(item);
  return items;
}

describe("fetchWeeklyImports", () => {
  it("requests the weekly imports endpoint with product, partnerCodes, and marketingYears as query params", async () => {
    vi.mocked(contactEUAPI).mockResolvedValue(jsonResponse(200, "[]"));

    await collect(
      fetchWeeklyImports({
        product: "Ammonia",
        partnerCodes: ["RU", "EG"],
        marketingYears: ["2023", "2024"],
      }),
    );

    expect(contactEUAPI).toHaveBeenCalledTimes(1);
    const [path, searchParams] = vi.mocked(contactEUAPI).mock.calls[0];
    expect(path).toBe("/api/taxud/weeklyData/import");
    expect(searchParams?.getAll("products")).toEqual(["Ammonia"]);
    expect(searchParams?.getAll("partnerCodes")).toEqual(["RU", "EG"]);
    expect(searchParams?.getAll("marketingYears")).toEqual(["2023", "2024"]);
  });

  it("omits partnerCodes and marketingYears from the query when not given", async () => {
    vi.mocked(contactEUAPI).mockResolvedValue(jsonResponse(200, "[]"));

    await collect(fetchWeeklyImports({ product: "Urea" }));

    const [, searchParams] = vi.mocked(contactEUAPI).mock.calls[0];
    expect(searchParams?.has("partnerCodes")).toBe(false);
    expect(searchParams?.has("marketingYears")).toBe(false);
  });

  it("yields nothing when the API reports no matching data (404)", async () => {
    vi.mocked(contactEUAPI).mockResolvedValue(jsonResponse(404));

    const result = await collect(fetchWeeklyImports({ product: "Ammonia" }));

    expect(result).toEqual([]);
  });

  it("throws for a non-ok, non-404 response", async () => {
    vi.mocked(contactEUAPI).mockResolvedValue(jsonResponse(500));

    await expect(collect(fetchWeeklyImports({ product: "Ammonia" }))).rejects.toThrow(
      /500/,
    );
  });

  it("parses real rows, keeping the five value fields as exact strings and week/procedure/preference as numbers", async () => {
    // Raw JSON text, not a JS object passed through JSON.stringify — a JS
    // number *literal* this precise would already be rounded by the JS
    // parser before JSON.stringify ever ran, defeating the point of the
    // test (this exact mistake happened once during development).
    const body =
      '[{"sector":"Fertilisers","marketingYear":"2023","week":1,' +
      '"memberStateCode":"FI","memberStateName":"Finland","partnerCode":"RU",' +
      '"partner":"Russia","product":"Ammonia","cn8ProductCode":"28141000",' +
      '"taric10ProductCode":"2814100000","procedure":4000,"preference":100,' +
      '"euroValue":100.5,"unitValue":1.25,"kg":123456789012345.678,' +
      '"kgEquivalent":9999999,"coefficient":1.5}]';
    vi.mocked(contactEUAPI).mockResolvedValue(jsonResponse(200, body));

    const [row] = await collect(fetchWeeklyImports({ product: "Ammonia" }));

    expect(row.week).toBe(1);
    expect(row.procedure).toBe(4000);
    expect(row.preference).toBe(100);
    expect(typeof row.week).toBe("number");

    expect(row.kg).toBe("123456789012345.678");
    expect(row.euroValue).toBe("100.5");
    expect(row.unitValue).toBe("1.25");
    expect(row.kgEquivalent).toBe("9999999");
    expect(row.coefficient).toBe("1.5");
    expect(typeof row.kg).toBe("string");
  });
});

// These prove the property the whole design leans on: rows are parsed and
// handed out incrementally as the body arrives, not buffered first. The
// tests above all deliver the body as a single chunk, so none of them
// actually exercise streaming.
describe("fetchWeeklyImports streaming", () => {
  it("yields a parsed row before the rest of the body has been produced", async () => {
    let releaseSecondChunk!: () => void;
    const secondChunkGate = new Promise<void>((resolve) => {
      releaseSecondChunk = resolve;
    });
    let firstChunkSent = false;
    let secondChunkEnqueued = false;

    const body = new ReadableStream<Uint8Array>({
      async pull(controller) {
        const encode = (text: string) => new TextEncoder().encode(text);
        if (!firstChunkSent) {
          firstChunkSent = true;
          controller.enqueue(encode('[{"kg":"1","week":1},'));
          return;
        }
        await secondChunkGate;
        secondChunkEnqueued = true;
        controller.enqueue(encode('{"kg":"2","week":2}]'));
        controller.close();
      },
    });
    vi.mocked(contactEUAPI).mockResolvedValue(new Response(body, { status: 200 }));

    const rows = fetchWeeklyImports({ product: "Ammonia" });

    const first = await rows.next();
    expect(first.value).toMatchObject({ kg: "1", week: 1 });
    // The generator produced row 1 while the producer is still blocked on
    // the gate — i.e. before the second half of the response exists.
    expect(secondChunkEnqueued).toBe(false);

    releaseSecondChunk();
    expect((await rows.next()).value).toMatchObject({ kg: "2", week: 2 });
    expect((await rows.next()).done).toBe(true);
  });

  it("assembles rows correctly when JSON tokens are split across body chunks", async () => {
    const full =
      '[{"sector":"Fertilisers","week":1,"kg":"123456789012345.678","euroValue":"100.5"},' +
      '{"sector":"Fertilisers","week":2,"kg":"5","euroValue":"6"}]';

    // One byte per chunk — maximally adversarial: every number, string, and
    // structural token is split. (Payload is ASCII, so per-char encoding is
    // safe here.)
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const char of full) {
          controller.enqueue(new TextEncoder().encode(char));
        }
        controller.close();
      },
    });
    vi.mocked(contactEUAPI).mockResolvedValue(new Response(body, { status: 200 }));

    const rows = await collect(fetchWeeklyImports({ product: "Ammonia" }));

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      week: 1,
      kg: "123456789012345.678",
      euroValue: "100.5",
    });
    expect(rows[1]).toMatchObject({ week: 2, kg: "5", euroValue: "6" });
  });

  it("cancels the response body when the consumer stops iterating early", async () => {
    let cancelled = false;

    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        // Two complete rows, array intentionally left unclosed — a large
        // response the caller walks away from after the first row.
        controller.enqueue(
          new TextEncoder().encode('[{"kg":"1","week":1},{"kg":"2","week":2},'),
        );
      },
      cancel() {
        cancelled = true;
      },
    });
    vi.mocked(contactEUAPI).mockResolvedValue(new Response(body, { status: 200 }));

    for await (const row of fetchWeeklyImports({ product: "Ammonia" })) {
      expect(row).toMatchObject({ kg: "1", week: 1 });
      break;
    }

    // Let the break's cleanup (generator return -> readable cancel ->
    // body cancel) settle.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(cancelled).toBe(true);
  });
});
