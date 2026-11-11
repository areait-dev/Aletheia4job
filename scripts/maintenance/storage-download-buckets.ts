/**
 * Backup locale INCREMENTALE dei file dei bucket Supabase Storage (sola lettura su Supabase).
 *
 * - Scarica solo i file nuovi o cambiati; quelli già presenti con la stessa dimensione restano dove sono.
 * - NON cancella mai nulla dalla copia locale: se un file cambia all'origine, la versione vecchia viene
 *   spostata in <destinazione>/_versioni/<data-ora>/ prima di scrivere quella nuova. I file cancellati da
 *   Supabase restano nella copia locale.
 * - Ogni file è scaricato in un .part, controllato per dimensione e solo dopo rinominato.
 * - Scrive un log (data, file scaricati, errori) in <cartella-log>/backup-storage.log.
 * - Un file di blocco impedisce due esecuzioni contemporanee.
 *
 * Uso:
 *   npx tsx scripts/maintenance/storage-download-buckets.ts [cartella-destinazione] [--bucket=cvs,candidates]
 * Destinazione: argomento, oppure BACKUP_DEST. Log: BACKUP_LOG_DIR (default: <destinazione>/../log).
 * Codice di uscita: 0 ok, 1 errori (file non scaricati o errore generale), 2 già in esecuzione.
 */
import 'dotenv/config';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { listBucketObjects, type Obj } from './lib-storage-list';

config({ path: '.env.local' });

const arg = process.argv.slice(2).find((a) => !a.startsWith('--'));
const dest = (arg ?? process.env.BACKUP_DEST) as string;
if (!dest) {
  console.error('Indica la cartella di destinazione (argomento o BACKUP_DEST).');
  process.exit(1);
}
const logDir = process.env.BACKUP_LOG_DIR ?? path.join(dest, '..', 'log');
fs.mkdirSync(logDir, { recursive: true });
fs.mkdirSync(dest, { recursive: true });
const logFile = path.join(logDir, 'backup-storage.log');

function log(msg: string, isError = false) {
  const line = `${new Date().toISOString()} ${isError ? 'ERRORE ' : ''}${msg}`;
  (isError ? console.error : console.log)(line);
  fs.appendFileSync(logFile, line + '\n');
}

// --- blocco anti-esecuzione doppia ---
const lockFile = path.join(dest, '.backup.lock');
try {
  if (fs.existsSync(lockFile) && Date.now() - fs.statSync(lockFile).mtimeMs < 6 * 3600 * 1000) {
    log('Un altro backup è già in esecuzione (file di blocco recente). Uscita.', true);
    process.exit(2);
  }
  fs.writeFileSync(lockFile, String(process.pid));
} catch (e) {
  log(`Impossibile creare il file di blocco: ${(e as Error).message}`, true);
  process.exit(1);
}
const unlock = () => { try { fs.unlinkSync(lockFile); } catch { /* ignora */ } };
process.on('exit', unlock);

type ManifestEntry = { size: number | null; updatedAt: string | null; etag: string | null };
const manifestFile = path.join(dest, '.backup-manifest.json');
const manifest: Record<string, ManifestEntry> = fs.existsSync(manifestFile)
  ? JSON.parse(fs.readFileSync(manifestFile, 'utf8'))
  : {};
const saveManifest = () => {
  fs.writeFileSync(manifestFile + '.tmp', JSON.stringify(manifest));
  fs.renameSync(manifestFile + '.tmp', manifestFile);
};

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Imposta NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const bucketArg = process.argv.find((a) => a.startsWith('--bucket='))?.split('=')[1];
  const buckets = bucketArg ? bucketArg.split(',') : ['cvs', 'candidates'];
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  log(`=== Avvio backup incrementale → ${dest} (bucket: ${buckets.join(', ')}) ===`);

  let failures = 0, downloaded = 0, skipped = 0, versioned = 0, bytes = 0, adopted = 0;
  for (const bucket of buckets) {
    const files: Obj[] = await listBucketObjects(supabase, bucket);
    log(`[${bucket}] ${files.length} file in origine`);
    let bucketDownloaded = 0;
    for (const f of files) {
      const key2 = `${bucket}/${f.path}`;
      const target = path.join(dest, bucket, ...f.path.split('/'));
      const known = manifest[key2];
      const exists = fs.existsSync(target);
      const localSize = exists ? fs.statSync(target).size : -1;
      const sameSize = f.size === null ? exists : localSize === f.size;

      let needs = false;
      if (!exists) needs = true;
      else if (!sameSize) needs = true;
      else if (known && ((f.etag && known.etag && f.etag !== known.etag) || (f.updatedAt && known.updatedAt && f.updatedAt !== known.updatedAt))) needs = true;

      if (!needs) {
        if (!known) { manifest[key2] = { size: f.size, updatedAt: f.updatedAt ?? null, etag: f.etag ?? null }; adopted++; }
        skipped++;
        continue;
      }
      try {
        const { data, error } = await supabase.storage.from(bucket).download(f.path);
        if (error || !data) throw new Error(error?.message ?? 'download vuoto');
        const buf = Buffer.from(await data.arrayBuffer());
        if (f.size !== null && buf.length !== f.size) throw new Error(`dimensione ${buf.length} != ${f.size}`);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        const part = target + '.part';
        fs.writeFileSync(part, buf);
        if (exists) {
          // non perdere mai la versione precedente
          const old = path.join(dest, '_versioni', stamp, bucket, ...f.path.split('/'));
          fs.mkdirSync(path.dirname(old), { recursive: true });
          fs.renameSync(target, old);
          versioned++;
          log(`[${bucket}] versione precedente conservata: _versioni/${stamp}/${bucket}/${f.path}`);
        }
        fs.renameSync(part, target);
        manifest[key2] = { size: buf.length, updatedAt: f.updatedAt ?? null, etag: f.etag ?? null };
        downloaded++; bucketDownloaded++; bytes += buf.length;
        log(`[${bucket}] scaricato ${f.path} (${(buf.length / 1024).toFixed(0)} KB)`);
      } catch (e) {
        failures++;
        log(`[${bucket}] ${f.path}: ${(e as Error).message}`, true);
      }
    }
    log(`[${bucket}] scaricati ${bucketDownloaded}`);
  }
  saveManifest();
  log(`=== Fine: scaricati ${downloaded} (${(bytes / 1048576).toFixed(1)} MB), già presenti ${skipped} (di cui ${adopted} registrati ora), versioni precedenti conservate ${versioned}, errori ${failures} ===`);
  if (failures > 0) process.exit(1);
}

main().catch((e) => { log((e as Error).message, true); process.exit(1); });
