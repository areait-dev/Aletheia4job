import { defineConfig } from "vitest/config";
import path from "node:path";

// Config separata dal vitest.config.ts principale: SOLO tests/integration/,
// con setup che carica .env.test (mai .env) e verifica esplicitamente che
// punti a un DB di test prima di lasciar partire qualunque scrittura.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    setupFiles: ["tests/integration/setup.ts"],
    testTimeout: 30000,
    // I test scrivono/cancellano dati reali: mai in parallelo tra loro.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
