import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

const ENV_TEST_PATH = path.resolve(__dirname, "..", "..", ".env.test");

if (!fs.existsSync(ENV_TEST_PATH)) {
  throw new Error(
    "[tests/integration] .env.test non trovato. Copia .env.test.example in .env.test e compilalo " +
      "con le credenziali di un progetto Supabase DEDICATO AI TEST (mai quello di produzione)."
  );
}

// Sovrascrive qualunque DATABASE_URL/DIRECT_URL eventualmente già presente
// nell'ambiente (es. da .env caricato da un altro tool), per garantire che
// questi test parlino SEMPRE e SOLO con .env.test.
dotenv.config({ path: ENV_TEST_PATH, override: true });

if (process.env.ALLOW_TENANT_INTEGRATION_TESTS !== "true") {
  throw new Error(
    "[tests/integration] ALLOW_TENANT_INTEGRATION_TESTS non è 'true' in .env.test. " +
      "Conferma esplicita richiesta prima di eseguire scritture di test su un database reale."
  );
}

if (!process.env.DATABASE_URL) {
  throw new Error("[tests/integration] DATABASE_URL mancante in .env.test.");
}

const host = new URL(process.env.DATABASE_URL.replace(/^postgresql:/, "postgres:")).host;
// eslint-disable-next-line no-console
console.log(`[tests/integration] Esecuzione contro DATABASE_URL host="${host}" (da .env.test)`);
