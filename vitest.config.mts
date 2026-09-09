import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const alias = {
  "@": fileURLToPath(new URL(".", import.meta.url)),
  // Outside a Next.js build "server-only" resolves to the throwing variant
  // (Next's bundler swaps in the no-op via the "react-server" export
  // condition). Vitest runs in plain Node, so point it at the package's own
  // no-op export directly (its "exports" map doesn't expose this subpath, so
  // this has to be a file path, not require.resolve).
  "server-only": fileURLToPath(
    new URL("./node_modules/server-only/empty.js", import.meta.url),
  ),
};

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          // Pure logic, components (renderToStaticMarkup), route auth. No
          // database, no Docker, no setup — `npm run test:unit` runs just this.
          name: "unit",
          include: ["**/*.test.{ts,tsx}"],
          exclude: ["**/*.integration.test.ts", "**/node_modules/**"],
        },
      },
      {
        resolve: { alias },
        test: {
          // The *.integration.test.ts files. globalSetup starts one
          // postgres:17 testcontainer per run and points DATABASE_URL at it;
          // setupFiles guards against a real DB and truncates every table
          // before each test. Serial — the container is shared.
          name: "integration",
          include: ["**/*.integration.test.ts"],
          globalSetup: ["./test/pg-container.ts"],
          setupFiles: ["./test/integration-db.ts"],
          fileParallelism: false,
        },
      },
    ],
  },
});
