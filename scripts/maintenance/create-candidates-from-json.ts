/**
 * Crea candidati da un file JSON (fuori dal repository) collegando un CV già presente nello Storage.
 * Prova di default: controlla tutto e mostra cosa verrebbe creato, senza scrivere.
 *
 *   npx tsx scripts/maintenance/create-candidates-from-json.ts <candidati.json>            # prova
 *   npx tsx scripts/maintenance/create-candidates-from-json.ts <candidati.json> --apply    # crea
 *
 * Formato del JSON: array di oggetti con
 *   organizationId, userId, firstName, lastName, email, city, role, seniority, sector, status, source,
 *   cvUrl (percorso nel bucket cvs), e facoltativi phone, education, skills, province, notes.
 *
 * Controlli: organizzazione esistente, e-mail non già presente nell'organizzazione, file del CV presente nel bucket
 * e non già collegato a un altro candidato. Il file JSON contiene dati personali: non va messo nel repository.
 */
import 'dotenv/config';
import { config } from 'dotenv';
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import { resolveCvPath } from '../../utils/cvStorage';

config({ path: '.env.local' });

type Input = {
  organizationId: string; userId: string; firstName: string; lastName: string; email: string; city: string;
  role: string; seniority: string; sector: string; status: string; source: string; cvUrl: string;
  phone?: string; education?: string; skills?: string; province?: string; notes?: string;
};
const REQUIRED: (keyof Input)[] = ['organizationId', 'userId', 'firstName', 'lastName', 'email', 'city', 'role', 'seniority', 'sector', 'status', 'source', 'cvUrl'];

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error('Indica il file JSON.');
  const apply = process.argv.includes('--apply');
  const items = JSON.parse(fs.readFileSync(file, 'utf8')) as Input[];
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const prisma = new PrismaClient();
  try {
    let failed = 0;
    for (const it of items) {
      const label = `${it.firstName} ${it.lastName}`;
      const missing = REQUIRED.filter((k) => !String(it[k] ?? '').trim());
      if (missing.length) { console.error(`✗ ${label}: campi mancanti ${missing.join(', ')}`); failed++; continue; }
      const email = it.email.trim().toLowerCase();
      const org = await prisma.organization.findUnique({ where: { id: it.organizationId }, select: { id: true } });
      if (!org) { console.error(`✗ ${label}: organizzazione inesistente`); failed++; continue; }
      const dup = await prisma.candidate.findFirst({ where: { organizationId: it.organizationId, email: { equals: email, mode: 'insensitive' } }, select: { id: true } });
      if (dup) { console.error(`✗ ${label}: e-mail già presente (candidato ${dup.id})`); failed++; continue; }
      const cvPath = resolveCvPath(it.cvUrl);
      if (!cvPath) { console.error(`✗ ${label}: cvUrl non valido`); failed++; continue; }
      const dir = cvPath.split('/').slice(0, -1).join('/');
      const name = cvPath.split('/').pop()!;
      const { data: listed, error } = await supabase.storage.from('cvs').list(dir, { search: name, limit: 5 });
      if (error || !listed?.some((o) => o.name === name)) { console.error(`✗ ${label}: il file ${cvPath} non esiste nel bucket cvs`); failed++; continue; }
      const used = await prisma.candidate.count({ where: { cvUrl: { in: [it.cvUrl, cvPath] } } });
      if (used > 0) { console.error(`✗ ${label}: il file è già collegato a un candidato`); failed++; continue; }

      if (!apply) { console.log(`✓ (prova) creerei ${label} <${email}> — ruolo "${it.role}", settore "${it.sector}", CV ${cvPath}`); continue; }
      const c = await prisma.candidate.create({
        data: {
          organizationId: it.organizationId, userId: it.userId, firstName: it.firstName.trim(), lastName: it.lastName.trim(), email,
          phone: it.phone || undefined, city: it.city, role: it.role, seniority: it.seniority, sector: it.sector, status: it.status,
          source: it.source, cvUrl: cvPath, education: it.education || undefined, skills: it.skills || undefined,
          province: it.province || undefined, notes: it.notes || undefined,
        },
        select: { id: true },
      });
      console.log(`✔ creato ${label} → id ${c.id}`);
    }
    if (failed) process.exitCode = 1;
  } finally { await prisma.$disconnect(); }
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
