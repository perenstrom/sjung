import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules", ".next", "app/generated", "__tests__/integration"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
    },
  },
});
