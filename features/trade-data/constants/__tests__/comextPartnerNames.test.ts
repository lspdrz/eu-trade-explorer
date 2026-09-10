import { describe, expect, it } from "vitest";
import { COMEXT_PARTNER_NAMES } from "@/features/trade-data/constants/comextPartnerNames";

describe("COMEXT_PARTNER_NAMES", () => {
  it("names the major fertiliser trade partners", () => {
    expect(COMEXT_PARTNER_NAMES.RU).toBe("Russia");
    expect(COMEXT_PARTNER_NAMES.EG).toBe("Egypt");
    expect(COMEXT_PARTNER_NAMES.DZ).toBe("Algeria");
    expect(COMEXT_PARTNER_NAMES.TT).toBe("Trinidad and Tobago");
    expect(COMEXT_PARTNER_NAMES.US).toBe("United States");
  });

  it("excludes aggregate and pseudo codes (they are the allowlist's job to drop)", () => {
    expect(COMEXT_PARTNER_NAMES.EXT_EU27_2020).toBeUndefined();
    expect(COMEXT_PARTNER_NAMES.INT_EU27_2020).toBeUndefined();
    for (const code of ["QP", "QR", "QV", "QW", "QY", "QZ"]) {
      expect(COMEXT_PARTNER_NAMES[code]).toBeUndefined();
    }
  });

  it("has 147 real territories, all with 2-letter codes and non-empty names", () => {
    const entries = Object.entries(COMEXT_PARTNER_NAMES);
    expect(entries).toHaveLength(147);
    for (const [code, name] of entries) {
      expect(code).toMatch(/^[A-Z]{2}$/);
      expect(name.length).toBeGreaterThan(0);
    }
  });
});
