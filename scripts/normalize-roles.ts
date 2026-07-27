/**
 * Due normalizzazioni manuali sul campo `role` (nessuna AI):
 *
 * 1) Rimuove i suffissi di località/contesto dai mansione grezzi importati
 *    dall'archivio (es. "segretario amministrativo per acate" ->
 *    "Segretario Amministrativo"), lasciando solo il nome della mansione.
 *
 * 2) Raggruppa tutti i ruoli IT/informatica in "Tecnico IT" (il bucket IT
 *    già più numeroso, 6 candidati), per evitare frammentazione.
 *
 * Uso:
 *   npx tsx scripts/normalize-roles.ts            -> dry-run
 *   npx tsx scripts/normalize-roles.ts --apply    -> scrive davvero
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ORG = 'org_prod_123';

// 1) Pulizia suffissi/location sui ruoli grezzi da archivio
const RENAME_MAP: Record<string, string> = {
  'segretario amministrativo per acate': 'Segretario Amministrativo',
  'agronomo o perito agrario per docenza sicilia': 'Agronomo o Perito Agrario',
  'docenti veneto - lombardia': 'Docente',
  'ammiistrazione e controllo di gestione': 'Amministrazione e Controllo di Gestione',
  'docente sostenibilità ambientale': 'Docente Sostenibilità Ambientale',
  'docenti sostenibilità e welfare': 'Docente Sostenibilità e Welfare',
  'termoidraulico': 'Termoidraulico',
  'operatore logistico': 'Operatore Logistico',
  'Consultant QHSE e Sostenibilità_': 'Consultant QHSE e Sostenibilità',
  'COMMERCIALE': 'Commerciale',
};

// 2) Ruoli IT/informatica da accorpare nel bucket più numeroso "Tecnico IT"
const IT_ROLES_TO_MERGE = [
  'docente comp informatiche e dig in fad',
  'docente ict e cybersecurity',
  'Docente Informatica/ICT',
  'Docente/Formatore ICT',
  'IT Manager/Specialist',
  'System Administrator/Network Engineer',
  'Cybersecurity Expert',
  'Ingegnere IT/Troubleshooting',
  'ICT Trainer/Network Specialist',
  'Junior IT Support',
  'IT Support Technician',
  'Help Desk / Operatore IT',
  'Network Administrator',
  'Sistemista/Virtualizzazione',
  'IT Support/Active Directory Specialist',
  'IT Infrastructure Technician',
  'Docente Informatica/Cybersecurity',
  'Technical Support Specialist/Sviluppatore',
  'Senior System Engineer',
  'Network Engineer',
  'Network Engineer/Researcher',
  'Cybersecurity Engineer',
  'Sviluppatore Backend Node.js',
  'Sviluppatore Software Junior',
  'Sviluppatore Web/SMM',
  'Sistemista Infrastructure L2',
  'Help Desk Tecnico',
  'Tecnico Sistemista Elettrotecnico',
  'Social Media Manager/IT Designer',
];
const IT_TARGET = 'Tecnico IT';

async function main() {
  const apply = process.argv.includes('--apply');
  console.log(`\n=== Normalizzazione ruoli (${apply ? 'APPLY' : 'DRY-RUN'}) ===\n`);

  let totalUpdated = 0;

  console.log('--- 1) Pulizia suffissi/località ---');
  for (const [from, to] of Object.entries(RENAME_MAP)) {
    const candidates = await prisma.candidate.findMany({
      where: { organizationId: ORG, role: from },
      select: { id: true, firstName: true, lastName: true },
    });
    if (candidates.length === 0) continue;
    console.log(`"${from}" -> "${to}" (${candidates.length} candidati)`);
    for (const c of candidates) {
      console.log(`  - ${c.firstName} ${c.lastName}`);
      if (apply) {
        await prisma.candidate.update({ where: { id: c.id }, data: { role: to } });
      }
      totalUpdated++;
    }
  }

  console.log('\n--- 2) Accorpamento ruoli IT/informatica in "Tecnico IT" ---');
  for (const from of IT_ROLES_TO_MERGE) {
    const candidates = await prisma.candidate.findMany({
      where: { organizationId: ORG, role: from },
      select: { id: true, firstName: true, lastName: true },
    });
    if (candidates.length === 0) continue;
    console.log(`"${from}" -> "${IT_TARGET}" (${candidates.length} candidati)`);
    for (const c of candidates) {
      console.log(`  - ${c.firstName} ${c.lastName}`);
      if (apply) {
        await prisma.candidate.update({ where: { id: c.id }, data: { role: IT_TARGET } });
      }
      totalUpdated++;
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`Totale aggiornati: ${totalUpdated}`);
  if (!apply) {
    console.log('\nDry-run: nessuna scrittura. Rilancia con --apply per applicare.');
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
