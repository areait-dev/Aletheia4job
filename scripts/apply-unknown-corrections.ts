/**
 * Applica al DB le correzioni di firstName/lastName/phone/city per i
 * candidati "Sconosciuto" i cui CV sono stati riletti manualmente
 * (visivamente, PDF per PDF) perché l'estrazione automatica del testo era
 * fallita (PDF scansionati o DOC legacy). Nessuna AI coinvolta.
 *
 * Legge scripts/_tmp-unknown-classified.json (id, firstName, lastName, phone, city, note).
 *
 * Uso:
 *   npx tsx scripts/apply-unknown-corrections.ts            -> dry-run
 *   npx tsx scripts/apply-unknown-corrections.ts --apply    -> scrive davvero
 */

import fs from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Row = { id: string; firstName: string | null; lastName: string | null; phone: string | null; city: string | null; note?: string };

async function main() {
  const apply = process.argv.includes('--apply');
  const rows: Row[] = JSON.parse(fs.readFileSync('scripts/_tmp-unknown-classified.json', 'utf-8'));

  console.log(`\n=== Correzione manuale candidati "Sconosciuto" (${rows.length} letti) ===`);
  console.log(apply ? 'Modalità: APPLY\n' : 'Modalità: DRY-RUN\n');

  let updated = 0, skipped = 0;

  for (const r of rows) {
    const data: Record<string, string> = {};
    if (r.firstName?.trim()) data.firstName = r.firstName.trim();
    if (r.lastName?.trim()) data.lastName = r.lastName.trim();
    if (r.phone?.trim()) data.phone = r.phone.trim();
    if (r.city?.trim()) data.city = r.city.trim();

    if (Object.keys(data).length === 0) {
      console.log(`- ${r.id}: SKIP — nessun dato leggibile${r.note ? ` (${r.note})` : ''}`);
      skipped++;
      continue;
    }

    const candidate = await prisma.candidate.findUnique({ where: { id: r.id }, select: { firstName: true, lastName: true } });
    if (!candidate) {
      console.log(`- ${r.id}: SKIP — non trovato`);
      skipped++;
      continue;
    }

    console.log(`- ${candidate.firstName} ${candidate.lastName} -> ${JSON.stringify(data)}`);
    if (apply) {
      await prisma.candidate.update({ where: { id: r.id }, data });
    }
    updated++;
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`Aggiornati: ${updated} | Saltati: ${skipped}`);
  if (!apply) {
    console.log('\nDry-run: nessuna scrittura. Rilancia con --apply per applicare (solo dopo conferma esplicita).');
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
