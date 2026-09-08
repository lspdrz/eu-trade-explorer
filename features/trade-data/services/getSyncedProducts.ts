import "server-only";
import { getSyncedProducts as querySyncedProducts } from "../db/queries/getSyncedProducts";

/**
 * The distinct synced product names. A thin pass-through: there's no
 * orchestration to do here, but `ui/` calls services, not queries — see
 * architecture-decisions.md's ui/ → services/ → db/ layering.
 */
export function getSyncedProducts(): Promise<string[]> {
  return querySyncedProducts();
}
