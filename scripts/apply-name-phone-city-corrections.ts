/**
 * Applica al DB le correzioni manuali di firstName/lastName/phone/city
 * ricavate leggendo il testo del CV (senza alcuna AI), per candidati il cui
 * nome/telefono/città erano stati letti male da un parsing automatico
 * precedente (es. "Sconosciuto -", "Per Il Curriculum", frammenti di
 * intestazioni, numeri di telefono confusi con date/CAP).
 *
 * Legge scripts/_tmp-classified-{1..4}.json (id, firstName, lastName, phone, city;
 * ciascun campo null se nessuna correzione).
 *
 * Uso:
 *   npx tsx scripts/apply-name-phone-city-corrections.ts            -> dry-run
 *   npx tsx scripts/apply-name-phone-city-corrections.ts --apply    -> scrive davvero
 */

import fs from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Row = { id: string; firstName: string | null; lastName: string | null; phone: string | null; city: string | null };

async function main() {
  const apply = process.argv.includes('--apply');
  const rows: Row[] = [1, 2, 3, 4].flatMap((i) =>
    JSON.parse(fs.readFileSync(`scripts/_tmp-classified-${i}.json`, 'utf-8'))
  );

  console.log(`\n=== Correzione manuale nome/telefono/città (${rows.length} candidati letti) ===`);
  console.log(apply ? 'Modalità: APPLY\n' : 'Modalità: DRY-RUN\n');

  let updated = 0, skipped = 0;

  for (const r of rows) {
    const updateData: Record<string, string> = {};
    if (r.firstName) updateData.firstName = r.firstName;
    if (r.lastName) updateData.lastName = r.lastName;
    if (r.phone) updateData.phone = r.phone;
    if (r.city) updateData.city = r.city;

    if (Object.keys(updateData).length === 0) {
      skipped++;
      continue;
    }

    const candidate = await prisma.candidate.findUnique({
      where: { id: r.id },
      select: { firstName: true, lastName: true },
    });
    if (!candidate) {
      console.log(`- ${r.id}: SKIP — non trovato`);
      skipped++;
      continue;
    }

    console.log(`- ${candidate.firstName} ${candidate.lastName}: ${JSON.stringify(updateData)}`);
    if (apply) {
      await prisma.candidate.update({ where: { id: r.id }, data: updateData });
    }
    updated++;
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`Aggiornati: ${updated} | Saltati (nessuna correzione): ${skipped}`);
  if (!apply) {
    console.log('\nDry-run: nessuna scrittura. Rilancia con --apply per applicare.');
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
