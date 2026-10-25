import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      // `server-only` throws outside the React Server environment; tests are server code.
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 120_000,
    // Each database test file runs its own in-memory PostgreSQL (PGlite); more parallel copies
    // exhaust memory on ordinary laptops and crash workers, so files run one at a time.
    maxWorkers: 1,
  },
});
