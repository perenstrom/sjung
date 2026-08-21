import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["__tests__/integration/**/*.test.ts"],
    setupFiles: ["__tests__/support/setup.ts"],
    hookTimeout: 20000,
    // Integration test files share one live TEST_DATABASE_URL and the
    // per-test truncate in __tests__/support/setup.ts resets the whole
    // database — running files in parallel would let one file's beforeEach
    // wipe another file's in-flight fixtures.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
    },
  },
});
