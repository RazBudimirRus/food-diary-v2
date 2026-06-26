import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["server/**/*.test.ts", "shared/**/*.test.ts", "test/**/*.test.ts"],
    coverage: {
      reporter: ["text", "html"],
      include: ["server/**/*.ts", "shared/**/*.ts"],
      exclude: ["server/vite.ts", "**/*.test.ts"],
    },
  },
});
