/**
 * Applica al DB la classificazione manuale (role/sector/seniority) dei
 * candidati "Recupero Storage" letta a mano dal CV, senza alcuna AI.
 * Legge scripts/_tmp-orphans-classified.json (id, role, sector, seniority).
 *
 * Uso:
 *   npx tsx scripts/apply-orphans-classification.ts            -> dry-run
 *   npx tsx scripts/apply-orphans-classification.ts --apply    -> scrive davvero
 */

import fs from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Row = { id: string; role: string; sector: string; seniority: string };

async function main() {
  const apply = process.argv.includes('--apply');
  const rows: Row[] = JSON.parse(fs.readFileSync('scripts/_tmp-orphans-classified.json', 'utf-8'));

  console.log(`\n=== Applica classificazione manuale (${rows.length} candidati) ===`);
  console.log(apply ? 'Modalità: APPLY\n' : 'Modalità: DRY-RUN\n');

  let updated = 0, skipped = 0;

  for (const r of rows) {
    const candidate = await prisma.candidate.findUnique({
      where: { id: r.id },
      select: { firstName: true, lastName: true, role: true, sector: true },
    });
    if (!candidate) {
      console.log(`- ${r.id}: SKIP — non trovato`);
      skipped++;
      continue;
    }
    if (candidate.role !== 'Da definire' || candidate.sector !== 'Da definire') {
      console.log(`- ${candidate.firstName} ${candidate.lastName}: SKIP — già modificato nel frattempo`);
      skipped++;
      continue;
    }

    console.log(`- ${candidate.firstName} ${candidate.lastName}: role="${r.role}" sector="${r.sector}" seniority="${r.seniority}"`);
    if (apply) {
      await prisma.candidate.update({
        where: { id: r.id },
        data: { role: r.role, sector: r.sector, seniority: r.seniority },
      });
    }
    updated++;
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`Aggiornati: ${updated} | Saltati: ${skipped}`);
  if (!apply) {
    console.log('\nDry-run: nessuna scrittura. Rilancia con --apply per applicare.');
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
