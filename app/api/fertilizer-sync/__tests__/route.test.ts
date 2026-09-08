import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/sync-eu-agrifood/services/runFertilizerSync", () => ({
  runFertilizerSync: vi.fn(),
}));

import { runFertilizerSync } from "@/features/sync-eu-agrifood/services/runFertilizerSync";
import { GET } from "../route";

const SECRET = "test-cron-secret";

function request(url: string, authHeader?: string) {
  const headers = authHeader ? { authorization: authHeader } : undefined;
  return new Request(url, { headers });
}

describe("GET /api/fertilizer-sync", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 401 when CRON_SECRET isn't set, even with a matching-looking header", async () => {
    vi.stubEnv("CRON_SECRET", "");

    const response = await GET(request("https://example.com/api/fertilizer-sync", "Bearer anything"));

    expect(response.status).toBe(401);
    expect(runFertilizerSync).not.toHaveBeenCalled();
  });

  it("returns 401 when the Authorization header doesn't match", async () => {
    vi.stubEnv("CRON_SECRET", SECRET);

    const response = await GET(
      request("https://example.com/api/fertilizer-sync", "Bearer wrong-secret"),
    );

    expect(response.status).toBe(401);
    expect(runFertilizerSync).not.toHaveBeenCalled();
  });

  it("returns 401 when there's no Authorization header at all", async () => {
    vi.stubEnv("CRON_SECRET", SECRET);

    const response = await GET(request("https://example.com/api/fertilizer-sync"));

    expect(response.status).toBe(401);
    expect(runFertilizerSync).not.toHaveBeenCalled();
  });

  it("calls runFertilizerSync with the mode query param and returns its results", async () => {
    vi.stubEnv("CRON_SECRET", SECRET);
    vi.mocked(runFertilizerSync).mockResolvedValue({
      Ammonia: { rowsWritten: 42, skipped: false },
    });

    const response = await GET(
      request("https://example.com/api/fertilizer-sync?mode=backfill", `Bearer ${SECRET}`),
    );

    expect(runFertilizerSync).toHaveBeenCalledWith("backfill");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      rowsWrittenByProduct: { Ammonia: { rowsWritten: 42, skipped: false } },
    });
  });

  it("passes null as the mode when no mode query param is given", async () => {
    vi.stubEnv("CRON_SECRET", SECRET);
    vi.mocked(runFertilizerSync).mockResolvedValue({});

    await GET(request("https://example.com/api/fertilizer-sync", `Bearer ${SECRET}`));

    expect(runFertilizerSync).toHaveBeenCalledWith(null);
  });

  it("returns a generic 502 when runFertilizerSync throws, without leaking the error", async () => {
    vi.stubEnv("CRON_SECRET", SECRET);
    vi.mocked(runFertilizerSync).mockRejectedValue(new Error("something specific broke"));

    const response = await GET(
      request("https://example.com/api/fertilizer-sync", `Bearer ${SECRET}`),
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "Sync failed" });
  });
});
