import { describe, expect, it } from "vitest";
import { assignColorSlots } from "../assignColorSlots";

describe("assignColorSlots", () => {
  it("assigns slots 0,1,2 in order to fresh codes", () => {
    expect(assignColorSlots(["US", "EG", "DZ"], {})).toEqual({ US: 0, EG: 1, DZ: 2 });
  });

  it("keeps existing assignments when a code is removed", () => {
    const first = assignColorSlots(["US", "EG", "DZ"], {});
    expect(assignColorSlots(["US", "DZ"], first)).toEqual({ US: 0, DZ: 2 });
  });

  it("gives a newly added code the lowest free slot", () => {
    const state = { US: 0, DZ: 2 };
    expect(assignColorSlots(["US", "DZ", "MA"], state)).toEqual({
      US: 0,
      DZ: 2,
      MA: 1,
    });
  });

  it("does not reorder-recolour survivors when the middle code is dropped", () => {
    const first = assignColorSlots(["US", "EG", "DZ"], {});
    const afterRemoval = assignColorSlots(["US", "DZ"], first);
    expect(afterRemoval.DZ).toBe(2); // NOT shifted down to 1
  });
});
