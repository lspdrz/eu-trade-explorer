import { describe, expect, it } from "vitest";
import { assignColorSlots } from "@/features/utils/assignColorSlots";

describe("assignColorSlots", () => {
  it("assigns slots 0,1,2 in order to fresh keys", () => {
    expect(assignColorSlots(["US", "EG", "DZ"], {}, 3)).toEqual({ US: 0, EG: 1, DZ: 2 });
  });

  it("keeps existing assignments when a key is removed", () => {
    const first = assignColorSlots(["US", "EG", "DZ"], {}, 3);
    expect(assignColorSlots(["US", "DZ"], first, 3)).toEqual({ US: 0, DZ: 2 });
  });

  it("gives a newly added key the lowest free slot", () => {
    const state = { US: 0, DZ: 2 };
    expect(assignColorSlots(["US", "DZ", "MA"], state, 3)).toEqual({
      US: 0,
      DZ: 2,
      MA: 1,
    });
  });

  it("does not reorder-recolour survivors when the middle key is dropped", () => {
    const first = assignColorSlots(["US", "EG", "DZ"], {}, 3);
    const afterRemoval = assignColorSlots(["US", "DZ"], first, 3);
    expect(afterRemoval.DZ).toBe(2); // NOT shifted down to 1
  });

  it("respects the max argument", () => {
    expect(assignColorSlots(["Ammonia", "Urea"], {}, 2)).toEqual({ Ammonia: 0, Urea: 1 });
  });

  it("never returns a slot outside [0, max) even when given more keys than max", () => {
    // Callers are expected not to let this happen, but the function must
    // still hand back a usable (in-range) color index rather than `max` —
    // one past the last valid entry in whatever color array the slot
    // indexes into — which would render as an undefined/missing color.
    const result = assignColorSlots(["A", "B", "C"], {}, 2);
    expect(result.A).toBe(0);
    expect(result.B).toBe(1);
    expect(result.C).toBeGreaterThanOrEqual(0);
    expect(result.C).toBeLessThan(2);
  });

  it("recycles overflow keys round-robin instead of piling them all onto one slot", () => {
    const result = assignColorSlots(["A", "B", "C", "D", "E"], {}, 2);
    expect(result).toEqual({ A: 0, B: 1, C: 0, D: 1, E: 0 });
  });
});
