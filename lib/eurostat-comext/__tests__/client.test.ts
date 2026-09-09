import { Response, fetch } from "undici";
import { describe, expect, it, vi } from "vitest";

vi.mock("undici", async (importOriginal) => ({
  ...(await importOriginal<typeof import("undici")>()),
  fetch: vi.fn(),
}));

import { contactComextAPI } from "../client";

const BASE =
  "https://ec.europa.eu/eurostat/api/comext/dissemination/statistics/1.0/data/DS-045409";

describe("contactComextAPI", () => {
  it("GETs the DS-045409 endpoint with the given search params", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));

    await contactComextAPI(new URLSearchParams({ format: "JSON", freq: "M" }));

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toBe(`${BASE}?format=JSON&freq=M`);
    expect(init?.method ?? "GET").toBe("GET");
  });

  it("works without params", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));
    await contactComextAPI();
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toBe(BASE);
  });

  it("returns whatever fetch resolves to — no status interpretation", async () => {
    const resp = new Response(null, { status: 413 });
    vi.mocked(fetch).mockResolvedValue(resp);
    expect(await contactComextAPI()).toBe(resp);
  });
});
