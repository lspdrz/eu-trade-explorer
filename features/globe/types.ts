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
