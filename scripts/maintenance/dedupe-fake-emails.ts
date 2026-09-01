/**
 * Elimina i candidati duplicati con email finta (@test.it, @gmail.test, ecc.
 * inserita tramite il form pubblico) quando esiste già un altro candidato
 * nella stessa organizzazione con l'email reale trovata leggendo il CV.
 * Prima di ogni eliminazione verifica che il record duplicato non abbia
 * note/colloqui/candidature propri che andrebbero persi silenziosamente.
 *
 * Uso:
 *   npx tsx scripts/dedupe-fake-emails.ts            -> dry-run
 *   npx tsx scripts/dedupe-fake-emails.ts --apply    -> elimina davvero
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PAIRS: { deleteId: string; keepId: string; name: string }[] = [
  { deleteId: '806ad5e8-f8d0-4f86-8c53-94152112cac1', keepId: '7a10dd46-7df1-4272-88e7-f485583980c5', name: 'Ali Pashazadeh' },
  { deleteId: 'af2e8332-2b9f-49a9-be5e-338313c5e040', keepId: 'e049398f-99a7-4b83-9b86-94aaa18a626f', name: 'Test TEst3 / Carlo Sortino' },
  { deleteId: '5f68226f-f295-418f-b94e-7569a26e291a', keepId: '723cd295-2e4b-439d-91bb-7f7eada160ef', name: 'Marco Di Stefano' },
  { deleteId: 'af46f4c2-1123-4e04-bdbf-edb4766db5af', keepId: '64643e6c-5d92-4a25-ad22-2990e8323476', name: 'Iolanda Palumpo / Iole Palumbo' },
  { deleteId: '8e62fb0b-f16c-440e-9a1a-27a8585521d9', keepId: '065910d5-6463-45b8-88d5-4e8f55a756a7', name: 'Luca Cristiano' },
  { deleteId: '7bfbdcd3-03b3-42db-b3c0-b5c8ca37d8f7', keepId: '367688c6-41a9-4c6c-8c9d-f6cc7d71b692', name: 'Angelo Vulcano' },
  { deleteId: 'ae96c7de-4526-42f9-8ebe-667d5733b3de', keepId: '3a9ae3b6-16f9-4c89-ba3f-29f0908248e6', name: 'Alessia Iurato' },
  { deleteId: '4610431d-c574-43a7-afe0-b28cb31384df', keepId: '4b30a0d0-4c2e-4d51-8e3e-5db40e94b4f3', name: 'Angelo Capobianco' },
  { deleteId: 'd7a175e2-5d15-4dc9-b518-7dfe269e86a2', keepId: '7b99a714-0fe0-4f9a-aa8b-b6128893f027', name: 'Michele Murgo' },
  { deleteId: '6a30876f-9047-40bc-8d10-7a9584eda1f3', keepId: 'dfa84a33-cbdd-450c-b2fc-64c0e3cefa78', name: 'Mariachiara Cassisi / Mariaclara Cassisi' },
];

async function main() {
  const apply = process.argv.includes('--apply');
  console.log(`\n=== Deduplica candidati con email finta (${apply ? 'APPLY' : 'DRY-RUN'}) ===\n`);

  let deleted = 0, skipped = 0;

  for (const pair of PAIRS) {
    const dup = await prisma.candidate.findUnique({
      where: { id: pair.deleteId },
      select: {
        firstName: true, lastName: true, email: true,
        _count: { select: { applications: true, candidateNotes: true, interviews: true } },
      },
    });
    if (!dup) {
      console.log(`- ${pair.name}: SKIP — già eliminato/non trovato`);
      skipped++;
      continue;
    }

    const hasOwnHistory = dup._count.applications > 0 || dup._count.candidateNotes > 0 || dup._count.interviews > 0;
    if (hasOwnHistory) {
      console.log(`- ${pair.name}: ATTENZIONE — ha ${dup._count.applications} candidature, ${dup._count.candidateNotes} note, ${dup._count.interviews} colloqui propri. SALTATO per sicurezza (richiede revisione manuale).`);
      skipped++;
      continue;
    }

    console.log(`- ${pair.name}: elimino id=${pair.deleteId} (email finta "${dup.email}") — mantengo id=${pair.keepId}`);
    if (apply) {
      await prisma.candidate.delete({ where: { id: pair.deleteId } });
    }
    deleted++;
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`Eliminati: ${deleted} | Saltati: ${skipped}`);
  if (!apply) {
    console.log('\nDry-run: nessuna eliminazione. Rilancia con --apply per eliminare davvero.');
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
