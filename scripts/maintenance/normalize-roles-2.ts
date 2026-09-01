/**
 * Seconda passata di accorpamento ruoli simili (nessuna AI), nei 4 cluster:
 * Commerciale, Docente (solo varianti generiche), Agronomo, Amministrativo/Segreteria.
 * Ogni cluster confluisce nel bucket già più numeroso.
 *
 * Uso:
 *   npx tsx scripts/normalize-roles-2.ts            -> dry-run
 *   npx tsx scripts/normalize-roles-2.ts --apply    -> scrive davvero
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ORG = 'org_prod_123';

const CLUSTERS: { target: string; roles: string[] }[] = [
  {
    target: 'Commerciale',
    roles: [
      'Consulente Commerciale',
      'Addetta Vendita',
      'Venditore',
      'Agente di Commercio',
      'Addetto Vendite/Logistica',
    ],
  },
  {
    target: 'Docente',
    roles: [
      'Docente Formatore',
      'Docente Competenze Digitali',
      'Docente Formazione Sicurezza',
      'Docente Universitario/Ricercatrice',
      'Docente Scienze/Biologia',
      'Docente Welfare Aziendale/Comunicazione',
      'Docente Formazione Professionale',
      'Docente Marketing/Strategic Advisor',
      'Tutor Didattico/Formatore',
      'Formatore/Progettista Sociale',
      'Formatore/Comunicazione',
      'Formatrice Manageriale/Soft Skills',
      'Formatore Informatico',
      'Formatrice Digital/Comunicazione',
      'Coach/Formatrice Aziendale',
      'HR Specialist / Formatrice',
      'Progettista Formazione Professionale',
      'Digital Marketing Trainer',
      'AI Trainer / Digital Marketing Trainer',
      'Consulente Didattico/Back-office',
      'Docente di Sostegno / Tutor BES-ADHD',
    ],
  },
  {
    target: 'Agronomo',
    roles: [
      'Agronomo o Perito Agrario',
      'Dottore in Scienze e Tecnologie Agrarie',
      'Field Agronomist',
      'Agronomo Controllo Qualita',
      'Agronomo Fitosanitario',
      'Ricercatrice Agraria',
    ],
  },
  {
    target: 'Segretario Amministrativo',
    roles: [
      'Responsabile Amministrativo',
      'Contabile',
      'Ragioniera',
      'Impiegato amministrativo',
      'Impiegata Amministrativa',
      'Impiegata di Segreteria',
      'Collaboratore Amministrativo',
      'Segretaria Generale',
    ],
  },
];

async function main() {
  const apply = process.argv.includes('--apply');
  console.log(`\n=== Normalizzazione ruoli - cluster (${apply ? 'APPLY' : 'DRY-RUN'}) ===\n`);

  let totalUpdated = 0;

  for (const cluster of CLUSTERS) {
    console.log(`\n--- Cluster -> "${cluster.target}" ---`);
    for (const from of cluster.roles) {
      const candidates = await prisma.candidate.findMany({
        where: { organizationId: ORG, role: from },
        select: { id: true, firstName: true, lastName: true },
      });
      if (candidates.length === 0) continue;
      console.log(`"${from}" -> "${cluster.target}" (${candidates.length} candidati)`);
      for (const c of candidates) {
        console.log(`  - ${c.firstName} ${c.lastName}`);
        if (apply) {
          await prisma.candidate.update({ where: { id: c.id }, data: { role: cluster.target } });
        }
        totalUpdated++;
      }
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
