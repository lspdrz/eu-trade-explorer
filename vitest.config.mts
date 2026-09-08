import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
      // Outside a Next.js build, "server-only" always resolves to the
      // variant that throws on import (Next's bundler is what swaps in the
      // no-op via the "react-server" export condition). Vitest runs in
      // plain Node, so alias it to the package's own no-op export directly
      // (its package.json "exports" map doesn't expose this subpath, so
      // this has to be a direct file path rather than require.resolve).
      "server-only": fileURLToPath(
        new URL("./node_modules/server-only/empty.js", import.meta.url),
      ),
    },
  },
  test: {
    setupFiles: ["./vitest.setup.ts"],
    // Integration tests share real state in local Postgres (inserting/
    // deleting rows under a sentinel product name). Vitest's default
    // cross-file parallelism runs those files concurrently in separate
    // workers, letting their writes race each other — confirmed directly
    // (repeated default runs flaky with mismatched row counts; repeated
    // serial runs consistently clean). Any test file touching the real
    // database needs to run serially with any other that does the same.
    fileParallelism: false,
  },
});
