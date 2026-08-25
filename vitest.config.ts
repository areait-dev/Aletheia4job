import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    // Solo l'audit statico: il test di integrazione (tests/integration/) scrive
    // su un DB reale e va lanciato a parte con `npm run test:integration`,
    // che punta esplicitamente a .env.test (mai al DB di produzione).
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/integration/**", "node_modules/**"],
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
