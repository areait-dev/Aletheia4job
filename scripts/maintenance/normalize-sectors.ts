// script/normalize-sectors.ts
// Script batch one-off: nessun tenant context (nessuna sessione utente), quindi
// usa deliberatamente il client non scoped invece del default esteso.
import { dbUnscoped as prisma } from "../../utils/db";

async function normalizeSectors() {
  const sectors = await prisma.candidate.findMany({
    select: { id: true, sector: true }
  });

  for (const c of sectors) {
    if (!c.sector) continue;
    const normalized = c.sector.trim().toUpperCase(); // Es: "IT"
    
    if (normalized !== c.sector) {
      await prisma.candidate.update({
        where: { id: c.id },
        data: { sector: normalized }
      });
      console.log(`Aggiornato ${c.id}: "${c.sector}" → "${normalized}"`);
    }
  }
  console.log("✅ Normalizzazione completata");
}
normalizeSectors();