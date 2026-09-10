import { Response } from "undici";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/eurostat-comext/client", () => ({ contactComextAPI: vi.fn() }));

import { contactComextAPI } from "@/lib/eurostat-comext/client";
import { COMEXT_HEADINGS } from "@/features/sync-comext/constants/headings";
import { fetchComextImports } from "@/features/sync-comext/lib/fetchComextImports";

const HEADER =
  "STRUCTURE,STRUCTURE_ID,freq,reporter,partner,product,flow,indicators,TIME_PERIOD,OBS_VALUE\n";

function csvResponse(status: number, body = HEADER): Response {
  return new Response(body, { status });
}

describe("fetchComextImports", () => {
  it("requests SDMX 3.0 CSV with the heading's CN8 codes, both indicators, imports, and the year's month range", async () => {
    vi.mocked(contactComextAPI).mockResolvedValue(csvResponse(200));

    await fetchComextImports({ heading: "2814", year: 2023 });

    const params = vi.mocked(contactComextAPI).mock.calls[0][0] as URLSearchParams;
    expect(params.get("format")).toBe("csvdata");
    expect(params.get("c[flow]")).toBe("1");
    expect(params.get("c[indicators]")).toBe("QUANTITY_IN_100KG,VALUE_IN_EUROS");
    expect(params.get("c[product]")).toBe(COMEXT_HEADINGS["2814"].join(","));
    expect(params.get("c[TIME_PERIOD]")).toBe("ge:2023-01+le:2023-12");
    expect(params.has("c[partner]")).toBe(false);
  });

  it("throws on a non-200", async () => {
    vi.mocked(contactComextAPI).mockResolvedValue(csvResponse(500, ""));
    await expect(fetchComextImports({ heading: "3102", year: 2020 })).rejects.toThrow(
      /500/,
    );
  });

  it("returns parsed observations for a 200 (header-only → [])", async () => {
    vi.mocked(contactComextAPI).mockResolvedValue(csvResponse(200));
    expect(await fetchComextImports({ heading: "2814", year: 2023 })).toEqual([]);
  });
});
