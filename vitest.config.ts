import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    reporters: ["default", "json"],
    outputFile: {
      json: "./test-results.json",
    },
    testTimeout: 30000, // E2Eテストは時間がかかるので延長
  },
});
