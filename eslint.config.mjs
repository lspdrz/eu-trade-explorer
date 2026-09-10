import { readdirSync } from "node:fs";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import noRelativeImportPaths from "eslint-plugin-no-relative-import-paths";

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
 * Every import uses the `@/` alias — no relative paths (`./` or `../`).
 * (all enforced in eslint.config.mjs)
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

// Root-level folders under features/ that are shared, not features.
const SHARED_ROOT_DIRS = ["constants", "db", "utils", "components"];
const FEATURE_DIRS = readdirSync("features", { withFileTypes: true })
  .filter((d) => d.isDirectory() && !SHARED_ROOT_DIRS.includes(d.name))
  .map((d) => d.name);

// Feature isolation, resolver-based (catches both `@/features/x/…` and
// `../../x/…`): a file in features/<f> may not reach into any other
// feature — only its own, `@/lib`, and the shared root folders.
const FEATURE_ISOLATION = {
  rules: {
    "import/no-restricted-paths": [
      "error",
      {
        zones: FEATURE_DIRS.map((f) => ({
          target: `./features/${f}`,
          from: "./features",
          except: [`./${f}`, ...SHARED_ROOT_DIRS.map((d) => `./${d}`)],
          message:
            "Features are independent — no cross-feature imports. Use @/lib, or promote shared code to a root features/ folder.",
        })),
      },
    ],
  },
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

  // --- Imports ------------------------------------------------------------

  // Every import uses the `@/` alias (repo root) — no relative paths at
  // all. Relative paths break silently when a file moves and obscure
  // which layer a dependency lives in.
  {
    plugins: { "no-relative-import-paths": noRelativeImportPaths },
    rules: {
      "no-relative-import-paths/no-relative-import-paths": [
        "error",
        { allowSameFolder: false, prefix: "@" },
      ],
    },
  },

  // --- Architectural boundaries -------------------------------------------

  // Feature isolation for every features/<f>/ (resolver-based).
  { files: ["features/**"], ...FEATURE_ISOLATION },

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
      "no-restricted-imports": ["error", { patterns: [NO_UI] }],
    },
  },

  // lib/ — a feature's own logic: server-only read models (marked per file
  // with `import "server-only"`) and pure view logic, side by side. No DB
  // client, no ui/.
  {
    files: ["features/**/lib/**"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [NO_DB, NO_UI] }],
    },
  },

  // ui/ — no direct DB (may import within its own ui/).
  {
    files: ["features/**/ui/**"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [NO_DB] }],
    },
  },

  // utils/ — genuinely generic, domain-agnostic helpers only (sync's
  // async-iterator combinators). Feature logic goes in lib/, not here.
  // Placed after ui/ so any ui/utils/** would also land here.
  {
    files: ["features/**/utils/**"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [NO_DB, NO_UI] }],
    },
  },
]);

export default eslintConfig;
