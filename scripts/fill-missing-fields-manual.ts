/**
 * Completa role/sector/seniority per i candidati d'archivio SENZA usare AI:
 * usa una mappatura statica definita a mano (mansione della cartella d'import
 * -> settore/seniority) per evitare di dipendere dalla quota Groq/Gemini.
 *
 * Copre i candidati con `role` noto (import manuale archivio). Per i candidati
 * "Recupero Storage" senza mansione nota, usa invece
 * scripts/apply-orphans-classification.ts (classificazione manuale via CV).
 *
 * Uso:
 *   npx tsx scripts/fill-missing-fields-manual.ts --org=<organizationId>
 *       -> dry-run
 *   npx tsx scripts/fill-missing-fields-manual.ts --org=<organizationId> --apply
 *       -> scrive davvero
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ROLE_MAP: Record<string, { sector: string; seniority: string }> = {
  'termoidraulico': { sector: 'Impiantistica/Manutenzione', seniority: 'Mid' },
  'Assistant manager - segreteria comm': { sector: 'Segreteria/Amministrazione', seniority: 'Mid' },
  'docente sostenibilità ambientale': { sector: 'Formazione/Docenza', seniority: 'Senior' },
  'Commerciale': { sector: 'Vendite/Commerciale', seniority: 'Mid' },
  'segretario amministrativo per acate': { sector: 'Segreteria/Amministrazione', seniority: 'Mid' },
  'docente comp informatiche e dig in fad': { sector: 'Formazione/Docenza', seniority: 'Senior' },
  'docenti veneto - lombardia': { sector: 'Formazione/Docenza', seniority: 'Senior' },
  'docenti sostenibilità e welfare': { sector: 'Formazione/Docenza', seniority: 'Senior' },
  'ammiistrazione e controllo di gestione': { sector: 'Amministrazione/Finance', seniority: 'Mid' },
  'Consultant QHSE e Sostenibilità_': { sector: 'Consulenza QHSE/Sostenibilità', seniority: 'Senior' },
  'docente ict e cybersecurity': { sector: 'Formazione/Docenza', seniority: 'Senior' },
  'Tecnico IT': { sector: 'IT/Tecnico', seniority: 'Mid' },
  'operatore logistico': { sector: 'Logistica', seniority: 'Junior' },
  'agronomo o perito agrario per docenza sicilia': { sector: 'Formazione/Docenza', seniority: 'Senior' },
  // CANDIDATURE SPONTANEE: lasciato "Da definire" intenzionalmente (troppo generico)
};

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const orgArg = args.find((a) => a.startsWith('--org='))?.split('=')[1];

  let organizationId = orgArg;
  if (!organizationId) {
    const orgs = await prisma.organization.findMany({ select: { id: true, name: true } });
    if (orgs.length === 1) {
      organizationId = orgs[0].id;
      console.log(`Organization rilevata automaticamente: ${orgs[0].name} (${organizationId})`);
    } else {
      console.error('Più organizzazioni trovate, specifica --org=<id>:');
      for (const o of orgs) console.error(`  - ${o.name}: ${o.id}`);
      process.exit(1);
    }
  }

  console.log(`\n=== Completamento manuale (senza AI) campi mancanti ===`);
  console.log(apply ? 'Modalità: APPLY (scriverà nel database)\n' : 'Modalità: DRY-RUN (nessuna scrittura)\n');

  let updated = 0, skipped = 0;

  for (const [role, mapping] of Object.entries(ROLE_MAP)) {
    const candidates = await prisma.candidate.findMany({
      where: { organizationId, role, sector: 'Da definire' },
      select: { id: true, firstName: true, lastName: true },
    });

    for (const c of candidates) {
      console.log(`- ${c.firstName} ${c.lastName} [${role}] -> sector="${mapping.sector}" seniority="${mapping.seniority}"`);
      if (apply) {
        await prisma.candidate.update({
          where: { id: c.id },
          data: { sector: mapping.sector, seniority: mapping.seniority },
        });
      }
      updated++;
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`Aggiornati: ${updated}`);
  if (!apply) {
    console.log('\nQuesto era un dry-run: nessun dato è stato scritto.');
    console.log('Ricontrolla sopra, poi rilancia con --apply per scrivere davvero.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
