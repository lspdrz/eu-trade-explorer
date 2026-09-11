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
});
