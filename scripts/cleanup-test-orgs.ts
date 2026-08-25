/**
 * Rete di sicurezza per la CI dell'integration test di tenant isolation
 * (tests/integration/tenant-isolation.test.ts): rimuove qualunque
 * organizzazione "[test] ..." residua sul DB puntato da DATABASE_URL.
 *
 * Il test ha già un afterAll che ripulisce da solo in condizioni normali;
 * questo script serve per il caso in cui il job CI venga interrotto a metà
 * (timeout, cancellazione) prima che l'afterAll riesca a girare. Viene quindi
 * eseguito come step CI separato con `if: always()`, indipendentemente
 * dall'esito o dall'interruzione dello step di test.
 *
 * Va lanciato SOLO contro il DB di test dedicato: DATABASE_URL viene passato
 * esplicitamente dal workflow CI dal secret TEST_DATABASE_URL.
 */
import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("[cleanup-test-orgs] DATABASE_URL non impostata. Interrotto.");
  process.exit(1);
}

const prisma = new PrismaClient({ datasourceUrl: databaseUrl });

async function main() {
  const host = new URL(databaseUrl!.replace(/^postgresql:/, "postgres:")).host;
  console.log(`[cleanup-test-orgs] Connesso a host="${host}"`);

  const orgs = await prisma.organization.findMany({
    where: { name: { startsWith: "[test]" } },
    select: { id: true, name: true },
  });

  if (orgs.length === 0) {
    console.log("[cleanup-test-orgs] Nessuna organizzazione [test] residua.");
    return;
  }

  console.log(
    `[cleanup-test-orgs] Rimuovo ${orgs.length} organizzazioni residue:`,
    orgs.map((o) => o.name)
  );

  // onDelete: Cascade su tutte le relazioni figlie (Job, Candidate,
  // Application, Membership, ecc. - vedi prisma/schema.prisma) elimina
  // automaticamente tutto ciò che pende da queste organizzazioni.
  await prisma.organization.deleteMany({
    where: { id: { in: orgs.map((o) => o.id) } },
  });

  console.log("[cleanup-test-orgs] Fatto.");
}

main()
  .catch((error) => {
    console.error("[cleanup-test-orgs] Errore:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
