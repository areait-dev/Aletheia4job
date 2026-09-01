/**
 * Recupera i candidati "persi" a seguito del reset del database: per ogni CV
 * orfano nel bucket Storage 'cvs' (file non collegato a nessun Candidate.cvUrl),
 * scarica il PDF/DOCX, ne estrae nome/email/telefono, e crea (o aggiorna) il
 * relativo Candidate — così torna a comparire in archivio.
 *
 * Uso:
 *   npx tsx scripts/storage-recover-orphans.ts --org=<organizationId>
 *       -> dry-run: mostra cosa verrebbe estratto/creato, senza scrivere nulla
 *
 *   npx tsx scripts/storage-recover-orphans.ts --org=<organizationId> --apply
 *       -> scrive davvero i candidati (e le candidature, se il job esiste ancora)
 *
 * Se esiste una sola Organization nel DB, --org è opzionale (viene rilevata da sola).
 */

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { Groq } from 'groq-sdk';

const prisma = new PrismaClient();

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Imposta NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nell\'ambiente.');
  }
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

const BUCKET = 'cvs';

async function listAllFiles(supabase: ReturnType<typeof getServiceClient>): Promise<string[]> {
  const paths: string[] = [];
  async function walk(prefix: string) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) {
      console.error(`Errore list("${prefix}"):`, error.message);
      return;
    }
    if (!data) return;
    for (const entry of data) {
      const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const isFolder = entry.id === null;
      if (isFolder) await walk(fullPath);
      else paths.push(fullPath);
    }
  }
  await walk('');
  return paths;
}

function extractPathFromPublicUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length));
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/;

const HEADER_STOPWORDS = [
  'curriculum', 'vitae', 'resume', 'cv',
  'informazioni personali', 'dati personali', 'esperienza lavorativa', 'esperienze lavorative',
  'esperienza professionale', 'esperienze di', 'formato europeo', 'istruzione e formazione',
  'istruzione e', 'competenze', 'altre competenze', 'profilo professionale', 'about me',
  'cittadinanza italiana', 'attività sociali', 'capacità e', 'chi sono', 'nome e cognome',
  'nome:', 'cognome:', 'data di nascita', 'contatti', 'formazione', 'istituto', 'via ', 'viale ',
  'piazza ', 'corso ', 'p.iva', 'partita iva', 'e-mail', 'email', 'tel.', 'telefono', 'cellulare',
  'pagina', 'unione', 'fondazione', 'esecutive summary', 'executive summary',
];

function isHeaderLine(line: string): boolean {
  const low = line.toLowerCase();
  return HEADER_STOPWORDS.some((s) => low.startsWith(s) || low === s);
}

function looksLikeName(words: string[]): boolean {
  if (words.length < 2 || words.length > 4) return false;
  return words.every((w) => /^[A-Za-zÀ-ÿ'.-]{2,}$/.test(w) && !/^\d/.test(w));
}

function titleCase(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function guessName(text: string, email: string): { firstName: string; lastName: string } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 25);

  // Passata 1: riga TUTTO MAIUSCOLO tipo "MARIO ROSSI" (tipico frontespizio CV)
  for (const line of lines) {
    if (EMAIL_RE.test(line) || PHONE_RE.test(line) || isHeaderLine(line)) continue;
    if (line !== line.toUpperCase()) continue;
    const words = line.split(/\s+/);
    if (looksLikeName(words) && line.length < 45) {
      const [first, ...rest] = words.map(titleCase);
      return { firstName: first, lastName: rest.join(' ') };
    }
  }

  // Passata 2: riga in Title Case tipo "Mario Rossi"
  for (const line of lines) {
    if (EMAIL_RE.test(line) || PHONE_RE.test(line) || isHeaderLine(line)) continue;
    const words = line.split(/\s+/);
    if (!looksLikeName(words)) continue;
    const isTitleCase = words.every((w) => /^[A-ZÀ-Þ][a-zà-ÿ'.-]+$/.test(w));
    if (isTitleCase && line.length < 45) {
      const [first, ...rest] = words;
      return { firstName: first, lastName: rest.join(' ') };
    }
  }

  // Fallback: deriva il nome dalla parte locale dell'email (es. mario.rossi@... -> Mario Rossi)
  const local = email.split('@')[0];
  if (local && !local.startsWith('recuperato-')) {
    const parts = local
      .replace(/\d+/g, '')
      .split(/[._-]+/)
      .map((p) => p.trim())
      .filter((p) => p.length >= 2);
    if (parts.length >= 2) {
      const [first, ...rest] = parts.map(titleCase);
      return { firstName: first, lastName: rest.join(' ') };
    }
    if (parts.length === 1) {
      return { firstName: titleCase(parts[0]), lastName: '-' };
    }
  }

  return { firstName: 'Sconosciuto', lastName: '' };
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

let groqClient: Groq | null = null;
function getGroq(): Groq | null {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  if (!groqClient) groqClient = new Groq({ apiKey });
  return groqClient;
}

async function extractCandidateInfoWithAI(text: string): Promise<AIExtracted | null> {
  const groq = getGroq();
  if (!groq || !text.trim()) return null;

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
    console.error('  ⚠️  Estrazione AI fallita:', (e as Error).message);
    return null;
  }
}

async function extractText(buffer: Buffer, ext: string): Promise<string> {
  try {
    if (ext === 'pdf') {
      const result = await pdfParse(buffer);
      return result.text || '';
    }
    if (ext === 'docx' || ext === 'doc') {
      const result = await mammoth.extractRawText({ buffer });
      return result.value || '';
    }
  } catch (e) {
    console.error('  ⚠️  Estrazione testo fallita:', (e as Error).message);
  }
  return '';
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

  const membership = await prisma.membership.findFirst({ where: { organizationId }, select: { userId: true } });
  if (!membership) {
    console.error('Nessun membro trovato per questa organizzazione, impossibile assegnare userId ai candidati recuperati.');
    process.exit(1);
  }
  const fallbackUserId = membership.userId;

  const supabase = getServiceClient();

  const existingCandidates = await prisma.candidate.findMany({
    where: { cvUrl: { not: null } },
    select: { cvUrl: true },
  });
  const referencedPaths = new Set(
    existingCandidates.map((c) => (c.cvUrl ? extractPathFromPublicUrl(c.cvUrl) : null)).filter(Boolean) as string[]
  );

  const allFiles = await listAllFiles(supabase);
  const orphans = allFiles.filter((f) => !referencedPaths.has(f));

  console.log(`\n=== Recupero CV orfani (bucket: ${BUCKET}) ===`);
  console.log(`File totali: ${allFiles.length} | Già collegati: ${referencedPaths.size} | Orfani da recuperare: ${orphans.length}`);
  console.log(apply ? 'Modalità: APPLY (scriverà nel database)\n' : 'Modalità: DRY-RUN (nessuna scrittura)\n');

  let created = 0, updated = 0, skipped = 0, failed = 0;

  for (const path of orphans) {
    const ext = path.split('.').pop()?.toLowerCase() ?? '';
    const jobIdFromPath = path.includes('/') ? path.split('/')[0] : null;

    process.stdout.write(`- ${path}: `);

    const { data: fileData, error: downloadError } = await supabase.storage.from(BUCKET).download(path);
    if (downloadError || !fileData) {
      console.log(`ERRORE download (${downloadError?.message})`);
      failed++;
      continue;
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const text = await extractText(buffer, ext);

    const emailMatch = text.match(EMAIL_RE);
    const phoneMatch = text.match(PHONE_RE);
    const regexEmail = emailMatch ? emailMatch[0].toLowerCase() : null;

    const ai = await extractCandidateInfoWithAI(text);

    const email = (ai?.email && EMAIL_RE.test(ai.email) ? ai.email.toLowerCase() : null)
      ?? regexEmail
      ?? `recuperato-${path.replace(/[\/.]/g, '-')}@non-estratto.local`;

    let firstName = ai?.firstName?.trim() || '';
    let lastName = ai?.lastName?.trim() || '';
    let nameFromAI = true;
    if (!firstName) {
      const guessed = guessName(text, email);
      firstName = guessed.firstName;
      lastName = guessed.lastName;
      nameFromAI = false;
    }

    const phone = ai?.phone?.trim() || (phoneMatch ? phoneMatch[0].trim() : undefined);
    const aiCity = ai?.city?.trim() || undefined;
    const aiRole = ai?.role?.trim() || undefined;
    const aiSeniority = ai?.seniority?.trim() || undefined;
    const aiSector = ai?.sector?.trim() || undefined;

    let job: { organizationId: string; title: string; category: string | null; sector: string | null; userId: string } | null = null;
    if (jobIdFromPath) {
      job = await prisma.job.findUnique({
        where: { id: jobIdFromPath },
        select: { organizationId: true, title: true, category: true, sector: true, userId: true },
      });
    }
    const targetOrgId = job?.organizationId ?? organizationId!;
    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);

    const existing = await prisma.candidate.findFirst({ where: { organizationId: targetOrgId, email } });

    const summary = `${firstName} ${lastName}`.trim() + ` <${email}>` + (job ? ` [job: ${job.title}]` : '') + (email.endsWith('@non-estratto.local') ? ' [email NON estratta]' : '') + (nameFromAI ? '' : ' [nome da verificare]');

    if (existing) {
      if (existing.cvUrl) {
        console.log(`SKIP — ${summary} — candidato già presente con un CV già assegnato`);
        skipped++;
        continue;
      }
      console.log(`UPDATE — ${summary} — candidato esistente senza CV, verrà collegato`);
      if (apply) {
        await prisma.candidate.update({ where: { id: existing.id }, data: { cvUrl: publicUrl } });
      }
      updated++;
    } else {
      console.log(`CREATE — ${summary}`);
      if (apply) {
        const candidate = await prisma.candidate.create({
          data: {
            firstName,
            lastName: lastName || '-',
            email,
            phone,
            city: aiCity || 'N/D',
            role: job?.title ?? aiRole ?? 'Da definire',
            seniority: aiSeniority || 'Mid',
            sector: job?.category || job?.sector || aiSector || 'Da definire',
            status: 'Nuovo',
            source: 'Recupero Storage',
            organizationId: targetOrgId,
            userId: job?.userId ?? fallbackUserId,
            cvUrl: publicUrl,
            resumeText: text || undefined,
            notes: nameFromAI ? undefined : '[NOME_DA_VERIFICARE] Nome estratto automaticamente in modo approssimativo (limite quota AI raggiunto durante il recupero) — verificare/correggere leggendo il CV.',
          },
        });

        if (jobIdFromPath && job) {
          const existingApp = await prisma.application.findUnique({
            where: { candidateId_jobId: { candidateId: candidate.id, jobId: jobIdFromPath } },
          }).catch(() => null);
          if (!existingApp) {
            await prisma.application.create({
              data: {
                candidateId: candidate.id,
                jobId: jobIdFromPath,
                organizationId: targetOrgId,
                status: 'Nuovo',
              },
            });
          }
        }
      }
      created++;
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`Creati: ${created} | Aggiornati: ${updated} | Saltati (duplicati): ${skipped} | Falliti: ${failed}`);
  if (!apply) {
    console.log('\nQuesto era un dry-run: nessun dato è stato scritto.');
    console.log('Ricontrolla i nomi/email estratti sopra, poi rilancia con --apply per scrivere davvero.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
