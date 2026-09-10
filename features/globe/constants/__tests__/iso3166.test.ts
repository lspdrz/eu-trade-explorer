import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ISO3166_NUMERIC_TO_ALPHA2 } from "@/features/globe/constants/iso3166";

describe("ISO3166_NUMERIC_TO_ALPHA2", () => {
  it("maps known numeric codes to the right alpha-2", () => {
    expect(ISO3166_NUMERIC_TO_ALPHA2["643"]).toBe("RU");
    expect(ISO3166_NUMERIC_TO_ALPHA2["818"]).toBe("EG");
    expect(ISO3166_NUMERIC_TO_ALPHA2["840"]).toBe("US");
    expect(ISO3166_NUMERIC_TO_ALPHA2["276"]).toBe("DE");
  });

  it("every value is a well-formed alpha-2 code", () => {
    for (const v of Object.values(ISO3166_NUMERIC_TO_ALPHA2)) {
      expect(v).toMatch(/^[A-Z]{2}$/);
    }
  });

  it("no alpha-2 value appears twice", () => {
    const values = Object.values(ISO3166_NUMERIC_TO_ALPHA2);
    expect(new Set(values).size).toBe(values.length);
  });

  it("covers (almost) every country geometry in the 110m topology", () => {
    const topo = JSON.parse(
      readFileSync("public/geo/countries-110m.json", "utf8"),
    );
    const ids: string[] = topo.objects.countries.geometries.map(
      (g: { id: string }) => String(g.id),
    );
    const missing = ids.filter((id) => !(id in ISO3166_NUMERIC_TO_ALPHA2));
    // One id-less polygon plus a couple of non-ISO territories may
    // legitimately be absent; keep the gap small.
    expect(missing.length).toBeLessThanOrEqual(3);
  });
});
