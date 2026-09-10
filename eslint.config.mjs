import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Project structure
 *
 *   app/         Routing only — pages + route handlers. No DB access; calls into features/.
 *   features/    One folder per capability:
 *     <feature>/
 *       ui/        React. RSCs fetch their own data. Can import from lib/ or db/.
 *       lib/       The feature's own logic: server-only read models / orchestration
 *                  (marked per file with `import "server-only"`) and pure view logic,
 *                  side by side, purpose-named. Sub-group when a cluster earns it.
 *       db/        The ONLY place that touches Postgres. queries/ (read), mutations/ (write).
 *       utils/     Genuinely generic, domain-agnostic helpers only (iterator combinators…).
 *                  Feature logic goes in lib/. types.ts — the feature's own shapes.
 *   lib/         Cross-feature code every feature may need (db client + schemas, EU API
 *                HTTP wrappers). Same idea as features/<f>/lib but app-wide scope.
 *
 * Import direction:  app → features/{feature}/ui → lib → db → @/lib
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
  message: "lib/, db/ and utils/ must not import from ui/.",
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

  // app/ — routing only: no direct DB access (go through a feature's lib/).
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

  // lib/ — a feature's own logic: server-only read models (marked per file
  // with `import "server-only"`) and pure view logic, side by side. No DB
  // client, no ui/, no cross-feature.
  {
    files: ["features/**/lib/**"],
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

  // utils/ — genuinely generic, domain-agnostic helpers only (sync's
  // async-iterator combinators). Feature logic goes in lib/, not here.
  // Placed after ui/ so any ui/utils/** would also land here.
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
