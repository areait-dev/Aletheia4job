import { NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/service';
import { dbUnscoped } from '@/utils/db';
import { getAuthContext } from '@/utils/authz';
import { CV_BUCKET } from '@/utils/cvStorage';

export const dynamic = 'force-dynamic';

const ALLOWED_BUCKETS = ['candidates', 'cvs', 'logos'] as const;
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXT_BY_BUCKET: Record<(typeof ALLOWED_BUCKETS)[number], Set<string>> = {
  candidates: new Set(['pdf', 'doc', 'docx']),
  cvs: new Set(['pdf', 'doc', 'docx']),
  logos: new Set(['png', 'jpg', 'jpeg', 'svg', 'webp']),
};

// L'organizzazione del file è sempre derivata lato server (mai dal client):
//  1) dall'annuncio (jobId) nei form pubblici di candidatura,
//  2) dalla sessione dell'utente loggato (upload dal gestionale),
//  3) dalle env dedicate ai form pubblici senza annuncio (spontanea / long list).
async function resolveUploadOrganizationId(jobId: string | null): Promise<string | null> {
  if (jobId) {
    const job = await dbUnscoped.job.findUnique({ where: { id: jobId }, select: { organizationId: true } });
    return job?.organizationId ?? null;
  }
  const auth = await getAuthContext().catch(() => null);
  if (auth) return auth.organizationId;
  return process.env.TEACHER_LONGLIST_ORG_ID || process.env.PUBLIC_SPONTANEOUS_ORG_ID || null;
}

function isBucketNotFound(message: string) {
  return /bucket not found/i.test(message);
}

function bucketNotFoundMessage(bucketName: string) {
  return `Bucket '${bucketName}' non trovato su Supabase. Controlla le impostazioni del bucket.`;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const requestedBucket = String(formData.get('bucket') ?? CV_BUCKET);
    // I CV vanno sempre nel bucket privato `cvs`: `candidates` non è più usato.
    const bucketName = requestedBucket === 'logos' ? 'logos' : CV_BUCKET;
    const jobId = formData.get('jobId') as string | null;
    console.log('Tentativo upload bucket:', bucketName, 'jobId:', jobId);

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'File mancante' }, { status: 400 });
    }

    if (!ALLOWED_BUCKETS.includes(requestedBucket as (typeof ALLOWED_BUCKETS)[number])) {
      return NextResponse.json({ error: 'Bucket non consentito' }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File troppo grande (max 5MB)' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const allowedExt = ALLOWED_EXT_BY_BUCKET[bucketName as (typeof ALLOWED_BUCKETS)[number]];
    if (!allowedExt.has(ext)) {
      return NextResponse.json({ error: `Formato non supportato (${[...allowedExt].join(', ').toUpperCase()})` }, { status: 400 });
    }

    const supabase = createServiceClient();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${ext}`;
    let filePath = fileName;
    if (bucketName === CV_BUCKET) {
      const organizationId = await resolveUploadOrganizationId(jobId);
      if (!organizationId) {
        return NextResponse.json({ error: 'Upload non disponibile: organizzazione non determinabile' }, { status: 400 });
      }
      // Il prefisso organizzazione è ciò che permette al server di verificare, quando
      // il percorso viene collegato a un candidato, che il file appartenga alla stessa organizzazione.
      filePath = `${organizationId}/${fileName}`;
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const { data, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType: file.type || undefined,
        upsert: false,
      });

    if (uploadError) {
      console.error('[upload-cv] Supabase Upload Error:', {
        message: uploadError.message,
        name: uploadError.name,
        bucket: bucketName,
        path: filePath,
        error: uploadError,
      });

      if (isBucketNotFound(uploadError.message)) {
        return NextResponse.json(
          { error: bucketNotFoundMessage(bucketName) },
          { status: 404 },
        );
      }

      return NextResponse.json(
        { error: uploadError.message || 'Upload fallito su Supabase Storage' },
        { status: 500 },
      );
    }

    if (!data?.path) {
      console.error('[upload-cv] Upload senza path restituito:', { bucket: bucketName, data });
      return NextResponse.json({ error: 'Upload fallito: nessun percorso restituito' }, { status: 500 });
    }

    // CV: si restituisce il solo percorso (da salvare in Candidate.cvUrl), mai un URL pubblico.
    // Logo (bucket pubblico): resta l'URL pubblico, usato direttamente nell'annuncio.
    if (bucketName === CV_BUCKET) {
      console.log('[upload-cv] OK:', { bucket: bucketName, path: data.path });
      return NextResponse.json({ url: data.path, path: data.path });
    }

    const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(data.path);
    if (!publicUrl) {
      return NextResponse.json({ error: 'URL pubblico non disponibile' }, { status: 500 });
    }
    return NextResponse.json({ url: publicUrl, path: data.path });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Errore sconosciuto';
    console.error('[upload-cv] Unexpected error:', error);

    if (message.includes('SUPABASE_SERVICE_ROLE_KEY') || message.includes('Configurazione Supabase')) {
      return NextResponse.json(
        { error: 'Storage non configurato sul server (manca SUPABASE_SERVICE_ROLE_KEY)' },
        { status: 500 },
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
