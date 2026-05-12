// script/normalize-sectors.ts
import prisma from "../utils/db";

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