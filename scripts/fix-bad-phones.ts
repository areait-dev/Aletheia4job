/**
 * Corregge i numeri di telefono errati (CAP o date scambiati per telefono
 * dall'estrazione automatica originaria), letti a mano dal testo completo
 * del CV. Dove il CV non riporta davvero un telefono, il campo viene
 * svuotato (null) invece di lasciare il dato sbagliato.
 *
 * Uso:
 *   npx tsx scripts/fix-bad-phones.ts            -> dry-run
 *   npx tsx scripts/fix-bad-phones.ts --apply    -> scrive davvero
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Fix = {
  id: string;
  firstName?: string;
  lastName?: string;
  phone: string | null;
  city?: string;
};

const FIXES: Fix[] = [
  { id: '64643e6c-5d92-4a25-ad22-2990e8323476', phone: '3487429315', city: 'Vittoria (RG)' }, // Iole Palumbo
  { id: '1e8c5850-fc92-4812-aa66-1ee260713119', phone: '3397733255', city: 'Marina di Ragusa (RG)' }, // Samuel Tasca
  { id: '40dca0d3-c3f0-4cfb-956f-92ef80fad4bf', firstName: 'Selenia', lastName: 'Saracino', phone: null, city: 'Vittoria (RG)' },
  { id: 'ba79f21b-62b3-41d3-87e0-5e61f599bf4b', firstName: 'Gloria', lastName: 'Iurato', phone: '+39 339 2115216', city: 'Santa Croce Camerina (RG)' },
  { id: '80824557-2a90-4dc3-8dde-ed286baf0a1b', phone: '3313232996', city: 'Este (PD)' }, // Aline Carolina Galvão
  { id: '061895d6-7d4e-409d-aa89-3257683f4830', phone: '3246320106', city: 'Milano' }, // Andrea Speranza
  { id: 'df029081-dfb0-4510-9e0e-47962fa24e63', phone: '+39 338 5815876' }, // Andrea Corsi
  { id: 'd1b7bb23-a1c1-41c2-b2b5-f4cbf89f331f', phone: null }, // Marialuisa Damini - nessun telefono nel CV
  { id: 'd0b0c265-8d91-4ce9-b066-60cd051db208', phone: null }, // Francesca Guerisoli - nessun telefono nel CV
  { id: '5807d3df-3bdb-43be-bdb9-b567e3578e92', phone: null }, // Giovanni Messina - nessun telefono nel CV
  { id: '2890f95a-16d0-43af-b322-6cf6388b438f', phone: null }, // Felice Sassi (1) - nessun telefono nel CV
  { id: '0d00aa9c-17ff-4bf5-8343-17b562178716', phone: null }, // Felice Sassi (2, duplicato) - nessun telefono nel CV
];

async function main() {
  const apply = process.argv.includes('--apply');
  console.log(`\n=== Correzione telefoni errati (${apply ? 'APPLY' : 'DRY-RUN'}) ===\n`);

  for (const fix of FIXES) {
    const candidate = await prisma.candidate.findUnique({
      where: { id: fix.id },
      select: { firstName: true, lastName: true, phone: true, city: true },
    });
    if (!candidate) {
      console.log(`- ${fix.id}: SKIP — non trovato`);
      continue;
    }

    const data: Record<string, string | null> = { phone: fix.phone };
    if (fix.firstName) data.firstName = fix.firstName;
    if (fix.lastName) data.lastName = fix.lastName;
    if (fix.city) data.city = fix.city;

    console.log(`- ${candidate.firstName} ${candidate.lastName} (telefono era "${candidate.phone}") -> ${JSON.stringify(data)}`);
    if (apply) {
      await prisma.candidate.update({ where: { id: fix.id }, data });
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`Totale: ${FIXES.length} candidati`);
  if (!apply) {
    console.log('\nDry-run: nessuna scrittura. Rilancia con --apply per applicare.');
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
