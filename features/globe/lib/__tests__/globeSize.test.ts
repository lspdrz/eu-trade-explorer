import { describe, expect, it } from "vitest";
import { computeGlobeSize } from "@/features/globe/lib/globeSize";

describe("computeGlobeSize", () => {
  it("uses the container width when the viewport is tall enough", () => {
    const size = computeGlobeSize({
      width: 600,
      top: 200,
      viewportHeight: 1200,
      reservedBelow: 56,
    });
    expect(size).toBe(600);
  });

  it("clamps to the max even on a very tall, very wide viewport", () => {
    const size = computeGlobeSize({
      width: 1000,
      top: 100,
      viewportHeight: 2000,
      reservedBelow: 56,
    });
    expect(size).toBe(720); // GLOBE_MAX
  });

  it("shrinks below the width when vertical room is the tighter constraint", () => {
    // Roughly a 13" laptop: a wide column, but a short viewport once the
    // nav bar and page header have taken their share.
    const size = computeGlobeSize({
      width: 720,
      top: 260,
      viewportHeight: 700,
      reservedBelow: 56,
    });
    expect(size).toBe(700 - 260 - 56); // 384
    expect(size).toBeLessThan(720);
  });

  it("floors at the min on a very cramped viewport", () => {
    const size = computeGlobeSize({
      width: 600,
      top: 400,
      viewportHeight: 500,
      reservedBelow: 56,
    });
    expect(size).toBe(320); // GLOBE_MIN
  });
});
