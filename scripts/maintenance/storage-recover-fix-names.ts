/**
 * Fase 2 del recupero CV: ri-processa con l'AI (Groq) i soli candidati creati
 * da scripts/storage-recover-orphans.ts il cui nome era caduto sul fallback
 * regex per esaurimento quota giornaliera (marcati con "[NOME_DA_VERIFICARE]"
 * nelle note). Aggiorna il record esistente (match by id/email) — non crea
 * mai nuovi candidati.
 *
 * Uso:
 *   npx tsx scripts/storage-recover-fix-names.ts --org=<organizationId>
 *       -> dry-run: mostra cosa verrebbe corretto
 *   npx tsx scripts/storage-recover-fix-names.ts --org=<organizationId> --apply
 *       -> applica le correzioni
 *
 * Se la quota Groq si esaurisce di nuovo a metà, lo script si ferma in modo
 * pulito: i candidati non ancora corretti restano marcati e si può rilanciare
 * più tardi (idempotente).
 */

import { PrismaClient } from '@prisma/client';
import { Groq } from 'groq-sdk';

const prisma = new PrismaClient();
const MARKER = '[NOME_DA_VERIFICARE]';

let groqClient: Groq | null = null;
function getGroq(): Groq | null {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  if (!groqClient) groqClient = new Groq({ apiKey });
  return groqClient;
}

type AIExtracted = {
  firstName?: string;
  lastName?: string;
  city?: string;
  role?: string;
  seniority?: string;
  sector?: string;
};

async function extractCandidateInfoWithAI(text: string): Promise<AIExtracted | null> {
  const groq = getGroq();
  if (!groq || !text.trim()) return null;

  const prompt = `
Analizza il seguente testo estratto da un CV/curriculum e restituisci ESCLUSIVAMENTE un oggetto JSON con questi campi (usa null se un dato non è presente, non inventare nulla):
- firstName: string
- lastName: string
- city: string
- role: string
- seniority: string
- sector: string

Testo del CV:
${text.substring(0, 8000)}
`;

  try {
    const response = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'Sei un assistente HR che estrae dati strutturati da CV e risponde esclusivamente in JSON valido.' },
        { role: 'user', content: prompt },
      ],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      temperature: 0,
    });
    const content = response.choices[0]?.message?.content;
    if (!content) return null;
    return JSON.parse(content) as AIExtracted;
  } catch (e) {
    const message = (e as Error).message;
    if (message.includes('rate_limit_exceeded') || message.includes('429')) {
      throw new Error('RATE_LIMIT');
    }
    console.error('  ⚠️  Estrazione AI fallita:', message);
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const orgArg = args.find((a) => a.startsWith('--org='))?.split('=')[1];

  let organizationId = orgArg;
  if (!organizationId) {
    const orgs = await prisma.organization.findMany({ select: { id: true, name: true } });
    if (orgs.length === 1) {
      organizationId = orgs[0].id;
    } else {
      console.error('Più organizzazioni trovate, specifica --org=<id>:');
      for (const o of orgs) console.error(`  - ${o.name}: ${o.id}`);
      process.exit(1);
    }
  }

  const candidates = await prisma.candidate.findMany({
    where: {
      organizationId,
      source: 'Recupero Storage',
      notes: { contains: MARKER },
    },
    select: { id: true, firstName: true, lastName: true, email: true, resumeText: true, city: true, role: true, seniority: true, sector: true },
  });

  console.log(`\n=== Fix nomi candidati recuperati (org: ${organizationId}) ===`);
  console.log(`Candidati da correggere: ${candidates.length}`);
  console.log(apply ? 'Modalità: APPLY\n' : 'Modalità: DRY-RUN\n');

  let fixed = 0, stillUnknown = 0, stoppedByRateLimit = false;

  for (const c of candidates) {
    if (!c.resumeText) {
      console.log(`- ${c.email}: SKIP (nessun testo CV salvato)`);
      continue;
    }

    let ai: AIExtracted | null;
    try {
      ai = await extractCandidateInfoWithAI(c.resumeText);
    } catch (e) {
      if ((e as Error).message === 'RATE_LIMIT') {
        console.log(`\nQuota Groq esaurita di nuovo — mi fermo qui. Rilancia più tardi per continuare (${candidates.length - fixed - stillUnknown} candidati ancora da correggere).`);
        stoppedByRateLimit = true;
        break;
      }
      throw e;
    }

    if (!ai?.firstName) {
      console.log(`- ${c.email}: nome non estraibile, resta come 'da verificare'`);
      stillUnknown++;
      continue;
    }

    console.log(`- ${c.email}: "${c.firstName} ${c.lastName}" -> "${ai.firstName} ${ai.lastName || ''}".trim()`);

    if (apply) {
      const cleanedNotes = null; // rimuoviamo il marker una volta corretto
      await prisma.candidate.update({
        where: { id: c.id },
        data: {
          firstName: ai.firstName.trim(),
          lastName: ai.lastName?.trim() || '-',
          city: c.city === 'N/D' ? (ai.city?.trim() || c.city) : c.city,
          role: c.role === 'Da definire' ? (ai.role?.trim() || c.role) : c.role,
          seniority: c.seniority === 'Mid' ? (ai.seniority?.trim() || c.seniority) : c.seniority,
          sector: c.sector === 'Da definire' ? (ai.sector?.trim() || c.sector) : c.sector,
          notes: cleanedNotes,
        },
      });
    }
    fixed++;
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`Corretti: ${fixed} | Rimasti sconosciuti: ${stillUnknown} | Fermato per rate-limit: ${stoppedByRateLimit ? 'sì' : 'no'}`);
  if (!apply) {
    console.log('Dry-run: nessuna scrittura effettuata. Rilancia con --apply per applicare.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
