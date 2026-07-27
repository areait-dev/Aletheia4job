/**
 * Completa i candidati rimasti con campi "Da definire" (role/sector) perché
 * la quota Groq era esaurita durante il recupero CV orfani.
 *
 * Per ogni candidato con role='Da definire' o sector='Da definire' e che ha
 * un resumeText salvato, richiama Gemini per estrarre role/seniority/sector
 * (e city/phone se ancora mancanti) e aggiorna il record.
 *
 * Uso:
 *   npx tsx scripts/storage-fill-missing-fields.ts --org=<organizationId>
 *       -> dry-run: mostra cosa verrebbe aggiornato, senza scrivere nulla
 *
 *   npx tsx scripts/storage-fill-missing-fields.ts --org=<organizationId> --apply
 *       -> scrive davvero gli aggiornamenti
 *
 * Se esiste una sola Organization nel DB, --org è opzionale.
 */

import { PrismaClient } from '@prisma/client';
import { Groq } from 'groq-sdk';

const prisma = new PrismaClient();

let groqClient: Groq | null = null;
function getGroq(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY non impostata nell\'ambiente.');
  if (!groqClient) groqClient = new Groq({ apiKey });
  return groqClient;
}

async function extractWithOpenRouter(prompt: string): Promise<AIExtracted | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b:free',
        messages: [
          { role: 'system', content: 'Sei un assistente HR che estrae dati strutturati da CV e risponde esclusivamente in JSON valido.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${body}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    const jsonString = content.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonString) as AIExtracted;
  } catch (e) {
    console.error('  ⚠️  Estrazione AI (OpenRouter) fallita:', (e as Error).message);
    return null;
  }
}

type AIExtracted = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  city?: string;
  role?: string;
  seniority?: string;
  sector?: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function extractCandidateInfoWithAI(text: string): Promise<AIExtracted | null> {
  if (!text.trim()) return null;

  const prompt = `
Analizza il seguente testo estratto da un CV/curriculum e restituisci ESCLUSIVAMENTE un oggetto JSON con questi campi (usa null se un dato non è presente nel testo, non inventare nulla):
- firstName: string
- lastName: string
- email: string
- phone: string
- city: string
- role: string (ruolo/professione principale del candidato)
- seniority: string (es. Junior, Mid, Senior)
- sector: string (settore professionale)

Testo del CV:
${text.substring(0, 8000)}
`;

  if (process.env.OPENROUTER_API_KEY) {
    const viaOpenRouter = await extractWithOpenRouter(prompt);
    if (viaOpenRouter) return viaOpenRouter;
  }

  const groq = getGroq();
  for (let attempt = 0; attempt < 3; attempt++) {
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
      const msg = (e as Error).message;
      const isRateLimit = msg.includes('429') || msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('quota');
      if (isRateLimit && attempt < 2) {
        console.error(`  ⚠️  Rate limit, attendo 20s e riprovo (tentativo ${attempt + 1}/3)...`);
        await sleep(20000);
        continue;
      }
      console.error('  ⚠️  Estrazione AI fallita:', msg);
      return null;
    }
  }
  return null;
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
      console.log(`Organization rilevata automaticamente: ${orgs[0].name} (${organizationId})`);
    } else {
      console.error('Più organizzazioni trovate, specifica --org=<id>:');
      for (const o of orgs) console.error(`  - ${o.name}: ${o.id}`);
      process.exit(1);
    }
  }

  const candidates = await prisma.candidate.findMany({
    where: {
      organizationId,
      OR: [{ role: 'Da definire' }, { sector: 'Da definire' }],
    },
    select: { id: true, firstName: true, lastName: true, email: true, resumeText: true, phone: true, city: true, source: true },
  });

  console.log(`\n=== Completamento campi mancanti (Groq) ===`);
  console.log(`Candidati da definire trovati: ${candidates.length}`);
  console.log(apply ? 'Modalità: APPLY (scriverà nel database)\n' : 'Modalità: DRY-RUN (nessuna scrittura)\n');

  let updated = 0, skipped = 0, failed = 0;

  for (const c of candidates) {
    const label = `${c.firstName} ${c.lastName} <${c.email}>`;
    process.stdout.write(`- ${label}: `);

    if (!c.resumeText || !c.resumeText.trim()) {
      console.log('SKIP — nessun resumeText salvato');
      skipped++;
      continue;
    }

    const ai = await extractCandidateInfoWithAI(c.resumeText);
    if (!ai) {
      console.log('FALLITO — nessuna risposta AI');
      failed++;
      continue;
    }

    const updateData: Record<string, any> = {};
    // Non sovrascrivere `role` per i candidati importati dall'archivio manuale:
    // lì `role` è intenzionalmente la mansione della sottocartella di provenienza.
    const preserveRole = c.source === 'Import manuale archivio';
    if (!preserveRole && ai.role?.trim()) updateData.role = ai.role.trim();
    if (ai.seniority?.trim()) updateData.seniority = ai.seniority.trim();
    if (ai.sector?.trim()) updateData.sector = ai.sector.trim();
    if (!c.phone && ai.phone?.trim()) updateData.phone = ai.phone.trim();
    if ((!c.city || c.city === 'N/D') && ai.city?.trim()) updateData.city = ai.city.trim();

    if (Object.keys(updateData).length === 0) {
      console.log('SKIP — AI non ha estratto nulla di utile');
      skipped++;
      continue;
    }

    console.log(`UPDATE — ${JSON.stringify(updateData)}`);
    if (apply) {
      await prisma.candidate.update({ where: { id: c.id }, data: updateData });
    }
    updated++;
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`Aggiornati: ${updated} | Saltati: ${skipped} | Falliti: ${failed}`);
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
