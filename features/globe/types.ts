import type { Feature } from "geojson";

/**
 * A partner country's all-time EU import total, summed across every year
 * and both COMEXT fertilizer HS headings (2814 ammonia, 3102 nitrogenous
 * fertilisers). The globe's entire read model.
 */
export interface PartnerImportTotal {
  partnerCode: string;
  partner: string;
  /** Total import weight, converted from COMEXT's 100-kg unit to tonnes. */
  tonnes: number;
}

/**
 * One country polygon from the 110m topology, ready to draw: its alpha-2
 * partner code (null when the topology id has no ISO match), the GeoJSON
 * feature, and its great-circle centroid (the origin point of its flow arc).
 */
export interface Land {
  code: string | null;
  feature: Feature;
  centroid: [number, number];
}
