import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/sync-comext/services/runComextRefresh", () => ({
  runComextRefresh: vi.fn(),
}));

import { runComextRefresh } from "@/features/sync-comext/services/runComextRefresh";
import { GET } from "../route";

const SECRET = "test-cron-secret";
const req = (auth?: string) =>
  new Request("https://example.com/api/comext-refresh", {
    headers: auth ? { authorization: auth } : undefined,
  });

describe("GET /api/comext-refresh", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("401s when CRON_SECRET is unset", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await GET(req("Bearer anything"))).status).toBe(401);
    expect(runComextRefresh).not.toHaveBeenCalled();
  });

  it("401s on a wrong / missing bearer", async () => {
    vi.stubEnv("CRON_SECRET", SECRET);
    expect((await GET(req("Bearer wrong"))).status).toBe(401);
    expect((await GET(req())).status).toBe(401);
  });

  it("runs the refresh and returns its result on a valid bearer", async () => {
    vi.stubEnv("CRON_SECRET", SECRET);
    vi.mocked(runComextRefresh).mockResolvedValue({
      "2814": { rowsWritten: 800 },
      "3102": { rowsWritten: 4200 },
    });
    const res = await GET(req(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      "2814": { rowsWritten: 800 },
      "3102": { rowsWritten: 4200 },
    });
  });

  it("502s without leaking the error when the refresh throws", async () => {
    vi.stubEnv("CRON_SECRET", SECRET);
    vi.mocked(runComextRefresh).mockRejectedValue(new Error("specific"));
    const res = await GET(req(`Bearer ${SECRET}`));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "Refresh failed" });
  });
});
