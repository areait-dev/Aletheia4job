/**
 * Importa in blocco i CV presenti in una cartella locale organizzata per
 * sottocartelle/mansione (es. Desktop/cv/<mansione>/curriculum.pdf) come
 * archivio candidati generico, SENZA collegarli a nessun Job/Application.
 *
 * Per ciascun file:
 *  1. Estrae il testo (PDF/DOCX)
 *  2. Estrae email/telefono via regex e nome via euristica sul testo
 *     (con arricchimento opzionale via AI se GEMINI_API_KEY o GROQ_API_KEY
 *     sono configurate e funzionanti — altrimenti fallback silenzioso)
 *  3. Verifica deduplica su Candidate.organizationId + email: se il
 *     candidato esiste già, salta e logga come duplicato
 *  4. Carica il file su Supabase Storage (bucket 'cvs', stesso bucket usato
 *     per le candidature dirette)
 *  5. Crea il Candidate con source = "Import manuale archivio" e il campo
 *     `role` (mansione/profilo — non essendoci un Job collegato, è il campo
 *     più adatto nello schema Candidate per questo scopo) valorizzato con
 *     il nome della sottocartella di provenienza
 *  6. NON crea nessuna Application — questo script non importa né tocca
 *     mai `prisma.application` o `prisma.job`
 *  7. Per ogni Candidate creato, chiama l'endpoint interno
 *     POST /api/internal/queue-cv-processing sull'app di PRODUZIONE
 *     (PRODUCTION_APP_URL), che a sua volta accoda l'evento Inngest
 *     "cv/candidate-process.requested" (funzione processCandidateCV in
 *     inngest/functions/cv-processing.ts, che NON richiede
 *     applicationId/jobId a differenza di processCV). Non si usa
 *     inngest.send() direttamente da questo script perché, lanciato in
 *     locale, userebbe la config Inngest locale (INNGEST_DEV) e non
 *     raggiungerebbe la coda reale collegata all'app in produzione.
 *     Le chiamate sono spaziate da un piccolo delay (QUEUE_DELAY_MS) per
 *     non sovraccaricare la coda tutte insieme. Se l'AI (Gemini) è ancora
 *     senza quota, l'evento resta comunque in coda/fallito su Inngest e
 *     può essere ritentato in blocco dalla dashboard Inngest in un secondo
 *     momento, senza bisogno di rilanciare script manuali.
 *  8. Logga tutto in un CSV di riepilogo: file, cartella/mansione, esito,
 *     email, candidateId (se creato), errore (se presente)
 *
 * Uso:
 *   npx tsx scripts/import-cv-archive.ts --dir="C:\Users\VSCODE\Desktop\cv" --org=<organizationId>
 *       -> dry-run: mostra cosa verrebbe creato, senza scrivere nulla né caricare file
 *
 *   npx tsx scripts/import-cv-archive.ts --dir="C:\Users\VSCODE\Desktop\cv" --org=<organizationId> --apply
 *       -> scrive davvero: upload su Storage + create Candidate
 *
 * Se esiste una sola Organization nel DB, --org è opzionale.
 */

import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

const prisma = new PrismaClient();

const BUCKET = 'cvs';
const SOURCE_LABEL = 'Import manuale archivio';
const SUPPORTED_EXT = new Set(['pdf', 'doc', 'docx']);
const QUEUE_DELAY_MS = 750; // rate-limiting tra un invio e l'altro all'endpoint di produzione

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function queueCvProcessing(candidateId: string, organizationId: string): Promise<{ ok: boolean; error?: string }> {
  const baseUrl = process.env.PRODUCTION_APP_URL;
  const secret = process.env.INTERNAL_IMPORT_SECRET;
  if (!baseUrl || !secret) {
    return { ok: false, error: 'PRODUCTION_APP_URL o INTERNAL_IMPORT_SECRET non impostati nell\'ambiente' };
  }

  try {
    const res = await fetch(`${baseUrl}/api/internal/queue-cv-processing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': secret,
      },
      body: JSON.stringify({ candidateId, organizationId, preserveRole: true }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { ok: false, error: `HTTP ${res.status}: ${body}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Imposta NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nell\'ambiente.');
  }
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

function mimeTypeFromExt(ext: string): string {
  switch (ext) {
    case 'pdf': return 'application/pdf';
    case 'doc': return 'application/msword';
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    default: return 'application/octet-stream';
  }
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

  for (const line of lines) {
    if (EMAIL_RE.test(line) || PHONE_RE.test(line) || isHeaderLine(line)) continue;
    if (line !== line.toUpperCase()) continue;
    const words = line.split(/\s+/);
    if (looksLikeName(words) && line.length < 45) {
      const [first, ...rest] = words.map(titleCase);
      return { firstName: first, lastName: rest.join(' ') };
    }
  }

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

  const local = email.split('@')[0];
  if (local && !local.startsWith('import-')) {
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
};

// Arricchimento AI best-effort: usa Groq se GROQ_API_KEY è configurata,
// altrimenti prova Gemini. In caso di qualunque errore (quota, rete, ecc.)
// ritorna null e lo script prosegue con la sola euristica regex.
async function extractCandidateInfoWithAI(text: string): Promise<AIExtracted | null> {
  if (!text.trim()) return null;

  const prompt = `
Analizza il seguente testo estratto da un CV/curriculum e restituisci ESCLUSIVAMENTE un oggetto JSON con questi campi (usa null se un dato non è presente nel testo, non inventare nulla):
- firstName: string
- lastName: string
- email: string
- phone: string
- city: string

Testo del CV:
${text.substring(0, 8000)}
`;

  if (process.env.GROQ_API_KEY) {
    try {
      const { Groq } = require('groq-sdk');
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
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
      if (content) return JSON.parse(content) as AIExtracted;
    } catch (e) {
      console.error('  ⚠️  Estrazione AI (Groq) fallita, uso euristica regex:', (e as Error).message);
    }
  }

  if (process.env.GEMINI_API_KEY) {
    try {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const result = await model.generateContent(prompt + '\nRestituisci ESCLUSIVAMENTE il JSON puro, senza markdown.');
      const responseText = result.response.text();
      const jsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(jsonString) as AIExtracted;
    } catch (e) {
      console.error('  ⚠️  Estrazione AI (Gemini) fallita, uso euristica regex:', (e as Error).message);
    }
  }

  return null;
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

type FileEntry = {
  absPath: string;
  relPath: string;
  mansione: string; // nome della sottocartella immediatamente sotto la root scansionata
  ext: string;
};

function walkDir(rootDir: string): FileEntry[] {
  const entries: FileEntry[] = [];

  function walk(currentDir: string) {
    const items = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const item of items) {
      const abs = path.join(currentDir, item.name);
      if (item.isDirectory()) {
        walk(abs);
      } else if (item.isFile()) {
        const ext = item.name.split('.').pop()?.toLowerCase() ?? '';
        const relPath = path.relative(rootDir, abs);
        const relParts = relPath.split(path.sep);
        // Prima componente del percorso relativo = sottocartella diretta sotto la root;
        // se il file è direttamente nella root, non c'è mansione nota.
        const mansione = relParts.length > 1 ? relParts[0] : 'Non specificato';
        entries.push({ absPath: abs, relPath, mansione, ext });
      }
    }
  }

  walk(rootDir);
  return entries;
}

type LogRow = {
  file: string;
  mansione: string;
  esito: 'creato' | 'duplicato' | 'errore' | 'saltato';
  email: string;
  candidateId: string;
  errore: string;
  codaInngest: string;
};

function csvEscape(value: string): string {
  if (/[",\n;]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function writeCsvLog(rows: LogRow[], outPath: string) {
  const header = ['file', 'mansione', 'esito', 'email', 'candidateId', 'errore', 'codaInngest'];
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push(header.map((h) => csvEscape(String(r[h as keyof LogRow] ?? ''))).join(','));
  }
  fs.writeFileSync(outPath, lines.join('\n'), 'utf-8');
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const dirArg = args.find((a) => a.startsWith('--dir='))?.split('=')[1];
  const orgArg = args.find((a) => a.startsWith('--org='))?.split('=')[1];

  const rootDir = dirArg ?? path.join(require('os').homedir(), 'Desktop', 'cv');
  if (!fs.existsSync(rootDir) || !fs.statSync(rootDir).isDirectory()) {
    console.error(`Cartella non trovata: ${rootDir}`);
    process.exit(1);
  }

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
    console.error('Nessun membro trovato per questa organizzazione, impossibile assegnare userId ai candidati importati.');
    process.exit(1);
  }
  const fallbackUserId = membership.userId;

  const allFiles = walkDir(rootDir);
  const supportedFiles = allFiles.filter((f) => SUPPORTED_EXT.has(f.ext));
  const skippedFiles = allFiles.filter((f) => !SUPPORTED_EXT.has(f.ext));

  console.log(`\n=== Import archivio CV (${rootDir}) ===`);
  console.log(`File trovati: ${allFiles.length} | Supportati (pdf/doc/docx): ${supportedFiles.length} | Ignorati: ${skippedFiles.length}`);
  console.log(apply ? 'Modalità: APPLY (scriverà nel database e su Storage)\n' : 'Modalità: DRY-RUN (nessuna scrittura)\n');

  const rows: LogRow[] = [];
  let created = 0, duplicated = 0, failed = 0, skipped = 0;

  for (const entry of supportedFiles) {
    const label = `[${entry.mansione}] ${entry.relPath}`;
    process.stdout.write(`- ${label}: `);

    try {
      const buffer = fs.readFileSync(entry.absPath);
      const text = await extractText(buffer, entry.ext);

      const emailMatch = text.match(EMAIL_RE);
      const phoneMatch = text.match(PHONE_RE);
      const regexEmail = emailMatch ? emailMatch[0].toLowerCase() : null;

      const ai = await extractCandidateInfoWithAI(text);

      const email = (ai?.email && EMAIL_RE.test(ai.email) ? ai.email.toLowerCase() : null)
        ?? regexEmail
        ?? `import-${entry.relPath.replace(/[\\/.\s]/g, '-').toLowerCase()}@non-estratto.local`;

      let firstName = ai?.firstName?.trim() || '';
      let lastName = ai?.lastName?.trim() || '';
      if (!firstName) {
        const guessed = guessName(text, email);
        firstName = guessed.firstName;
        lastName = guessed.lastName;
      }

      const phone = ai?.phone?.trim() || (phoneMatch ? phoneMatch[0].trim() : undefined);
      const city = ai?.city?.trim() || 'N/D';

      // --- Deduplica: Candidate.organizationId + email ---
      const existing = await prisma.candidate.findFirst({
        where: { organizationId: organizationId!, email },
        select: { id: true },
      });

      if (existing) {
        console.log(`DUPLICATO — ${firstName} ${lastName} <${email}> (candidato esistente: ${existing.id})`);
        duplicated++;
        rows.push({ file: entry.relPath, mansione: entry.mansione, esito: 'duplicato', email, candidateId: existing.id, errore: '', codaInngest: '' });
        continue;
      }

      if (!apply) {
        console.log(`CREARE — ${firstName} ${lastName} <${email}> — role="${entry.mansione}"`);
        created++;
        rows.push({ file: entry.relPath, mansione: entry.mansione, esito: 'creato', email, candidateId: '(dry-run)', errore: '', codaInngest: '(dry-run)' });
        continue;
      }

      // --- Upload su Supabase Storage (bucket 'cvs') ---
      const supabase = getServiceClient();
      const safeMansione = entry.mansione.replace(/[^a-zA-Z0-9_-]+/g, '_');
      const randomSuffix = Math.random().toString(36).substring(2);
      const storagePath = `manual-import/${safeMansione}/${Date.now()}-${randomSuffix}.${entry.ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, buffer, {
          contentType: mimeTypeFromExt(entry.ext),
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Upload Storage fallito: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

      // --- Create Candidate (nessuna Application, nessun Job) ---
      const candidate = await prisma.candidate.create({
        data: {
          organizationId: organizationId!,
          userId: fallbackUserId,
          firstName,
          lastName: lastName || '-',
          email,
          phone,
          city,
          role: entry.mansione,
          seniority: 'Mid',
          sector: 'Da definire',
          status: 'Nuovo',
          source: SOURCE_LABEL,
          cvUrl: publicUrl,
          resumeText: text || undefined,
        },
      });

      const queueResult = await queueCvProcessing(candidate.id, organizationId!);
      const codaInngest = queueResult.ok ? 'accodato' : `errore: ${queueResult.error}`;
      if (!queueResult.ok) {
        console.error(`  ⚠️  Accodamento Inngest fallito: ${queueResult.error}`);
      }
      await sleep(QUEUE_DELAY_MS);

      console.log(`CREATO — ${firstName} ${lastName} <${email}> — id=${candidate.id}`);
      created++;
      rows.push({ file: entry.relPath, mansione: entry.mansione, esito: 'creato', email, candidateId: candidate.id, errore: '', codaInngest });
    } catch (e) {
      const msg = (e as Error).message;
      console.log(`ERRORE — ${msg}`);
      failed++;
      rows.push({ file: entry.relPath, mansione: entry.mansione, esito: 'errore', email: '', candidateId: '', errore: msg, codaInngest: '' });
    }
  }

  for (const s of skippedFiles) {
    rows.push({ file: s.relPath, mansione: s.mansione, esito: 'saltato', email: '', candidateId: '', errore: 'estensione non supportata', codaInngest: '' });
    skipped++;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logPath = path.join(__dirname, `import-cv-archive-log-${timestamp}.csv`);
  writeCsvLog(rows, logPath);

  const queueFailed = rows.filter((r) => r.esito === 'creato' && r.codaInngest.startsWith('errore')).length;

  console.log('\n' + '─'.repeat(60));
  console.log(`Creati: ${created} | Duplicati: ${duplicated} | Falliti: ${failed} | Saltati (estensione): ${skipped}`);
  if (apply) {
    console.log(`Accodamento Inngest fallito per: ${queueFailed} candidati creati (vedi colonna codaInngest nel CSV)`);
  }
  console.log(`Log CSV scritto in: ${logPath}`);
  if (!apply) {
    console.log('\nQuesto era un dry-run: nessun dato è stato scritto né caricato su Storage.');
    console.log('Ricontrolla sopra, poi rilancia con --apply per scrivere davvero.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
