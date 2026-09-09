import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Project structure
 *
 *   app/         Routing only — pages + route handlers. No DB access; calls into features/.
 *   features/    One folder per capability, each split by layer:
 *     <feature>/
 *       ui/        React. RSCs fetch their own data; ui/utils/ is pure & client-safe. Can import
 *                  from db/ or services/
 *
 *       services/  Orchestration & policy. Coordinates db/ + pure logic + external APIs.
 *                  Exists only when there's something to orchestrate.
 *       db/        The ONLY place that touches Postgres. queries/ (read), mutations/ (write).
 *       utils/     Pure helpers. types.ts — the feature's own shapes.
 *   lib/         Cross-feature infra only (db client + schemas, EU API HTTP wrapper).
 *                No business logic; nothing feature-specific.
 *
 * Import direction:  app → features/{feature}/ui → services → db → lib
 * Features never import each other. Server modules start with `import "server-only"`.
 * (enforced in eslint.config.mjs)
 *
 */

// Reusable restricted-import groups, matched against the import specifier.
const NO_DB = {
  group: ["@/lib/db/client", "drizzle-orm", "drizzle-orm/*", "pg"],
  message:
    "Database access is confined to a feature's db/ folder (see architecture-decisions.md).",
};
const NO_UI = {
  group: ["**/ui/**"],
  message: "services/, db/ and utils/ must not import from ui/.",
};
const NO_CROSS_FEATURE = {
  group: ["@/features/*/**"],
  message:
    "Features are independent — no cross-feature imports. Use relative paths within a feature; promote shared code to lib/.",
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),

  // --- Architectural boundaries -------------------------------------------

  // app/ — routing only: no direct DB access (go through a feature's services/).
  {
    files: ["app/**"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [NO_DB] }],
    },
  },

  // db/ — the only layer allowed to touch the database.
  {
    files: ["features/**/db/**"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [NO_UI, NO_CROSS_FEATURE] }],
    },
  },

  // services/ — orchestration: no DB client, no ui/.
  {
    files: ["features/**/services/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [NO_DB, NO_UI, NO_CROSS_FEATURE] },
      ],
    },
  },

  // ui/ — no direct DB, no cross-feature imports (may import within its own ui/).
  {
    files: ["features/**/ui/**"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [NO_DB, NO_CROSS_FEATURE] }],
    },
  },

  // utils/ — pure helpers (sync's async-iterator helpers, trade-data's
  // ui/utils/). Placed after ui/ so ui/utils/** lands here: no DB, no ui/,
  // no cross-feature.
  {
    files: ["features/**/utils/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [NO_DB, NO_UI, NO_CROSS_FEATURE] },
      ],
    },
  },
]);

export default eslintConfig;
