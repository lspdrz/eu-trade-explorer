import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../fetchComextImports", () => ({ fetchComextImports: vi.fn() }));
vi.mock("../../db/mutations/replaceComextObservations", () => ({
  replaceComextObservations: vi.fn().mockResolvedValue({ rowsWritten: 0 }),
}));

import { replaceComextObservations } from "../../db/mutations/replaceComextObservations";
import { fetchComextImports } from "../fetchComextImports";
import { runComextRefresh } from "../runComextRefresh";

const obs = (period: string) => ({
  cn8ProductCode: "28141000",
  partnerCode: "RU",
  period,
  quantity100kg: 1,
  valueEuros: 1,
});

describe("runComextRefresh", () => {
  beforeEach(() => {
    vi.useFakeTimers().setSystemTime(new Date("2026-05-15"));
    vi.mocked(fetchComextImports).mockReset();
    vi.mocked(replaceComextObservations).mockClear().mockResolvedValue({ rowsWritten: 3 });
  });
  afterEach(() => vi.useRealTimers());

  it("fetches both headings x [thisYear-2 .. thisYear] and writes each heading once with the 36-month period list", async () => {
    vi.mocked(fetchComextImports).mockResolvedValue([obs("2024-01")]);

    await runComextRefresh();

    // 2 headings x 3 years
    expect(fetchComextImports).toHaveBeenCalledTimes(6);
    expect(fetchComextImports).toHaveBeenCalledWith({ heading: "2814", year: 2024 });
    expect(fetchComextImports).toHaveBeenCalledWith({ heading: "3102", year: 2026 });

    // one write per heading, periods = 2024-01..2026-12
    expect(replaceComextObservations).toHaveBeenCalledTimes(2);
    const call = vi.mocked(replaceComextObservations).mock.calls[0][0];
    expect(call.periods).toHaveLength(36);
    expect(call.periods[0]).toBe("2024-01");
    expect(call.periods.at(-1)).toBe("2026-12");
  });

  it("isolates a heading failure: the other still commits, the failed one reports { error } and is not written", async () => {
    vi.mocked(fetchComextImports).mockImplementation(async ({ heading }) => {
      if (heading === "3102") throw new Error("boom");
      return [obs("2024-01")];
    });

    const result = await runComextRefresh();

    expect(result["2814"]).toEqual({ rowsWritten: 3 });
    expect(result["3102"]).toMatchObject({ error: expect.stringContaining("boom") });
    expect(replaceComextObservations).toHaveBeenCalledTimes(1);
    expect(vi.mocked(replaceComextObservations).mock.calls[0][0].heading).toBe("2814");
  });

  it("skips the write for a heading that parses empty across all three years", async () => {
    vi.mocked(fetchComextImports).mockImplementation(async ({ heading }) =>
      heading === "2814" ? [] : [obs("2025-06")],
    );

    const result = await runComextRefresh();

    expect(result["2814"]).toEqual({ skipped: true });
    expect(result["3102"]).toEqual({ rowsWritten: 3 });
    expect(replaceComextObservations).toHaveBeenCalledTimes(1);
  });
});
