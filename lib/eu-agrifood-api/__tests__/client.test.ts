import { Response, fetch } from "undici";
import { describe, expect, it, vi } from "vitest";

vi.mock("undici", async (importOriginal) => ({
  ...(await importOriginal<typeof import("undici")>()),
  fetch: vi.fn(),
}));

import { contactEUAPI } from "../client";

describe("contactEUAPI", () => {
  it("builds the URL from the base, the given path, and search params", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));

    await contactEUAPI("/api/example", new URLSearchParams({ foo: "bar" }));

    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toBe("https://api.tech.ec.europa.eu/agrifood/api/example?foo=bar");
  });

  it("works without search params", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));

    await contactEUAPI("/api/example");

    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toBe("https://api.tech.ec.europa.eu/agrifood/api/example");
  });

  it("returns whatever fetch resolves to, unconditionally — no status interpretation here", async () => {
    const response = new Response(null, { status: 404 });
    vi.mocked(fetch).mockResolvedValue(response);

    const result = await contactEUAPI("/api/example");

    expect(result).toBe(response);
  });

  it("sends an Accept: application/json header", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));

    await contactEUAPI("/api/example");

    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect((init?.headers as Record<string, string>).Accept).toBe("application/json");
  });
});
