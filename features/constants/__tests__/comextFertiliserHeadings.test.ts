import { describe, expect, it } from "vitest";
import {
  AMMONIA_HEADING,
  COMEXT_FERTILISER_HEADINGS,
  NITROGENOUS_FERTILISER_HEADING,
} from "@/features/constants/comextFertiliserHeadings";

describe("comextFertiliserHeadings", () => {
  it("exposes ammonia (2814) and nitrogenous fertilisers (3102)", () => {
    expect(AMMONIA_HEADING).toBe("2814");
    expect(NITROGENOUS_FERTILISER_HEADING).toBe("3102");
  });

  it("collects both into COMEXT_FERTILISER_HEADINGS", () => {
    expect(COMEXT_FERTILISER_HEADINGS).toEqual([AMMONIA_HEADING, NITROGENOUS_FERTILISER_HEADING]);
  });
});
