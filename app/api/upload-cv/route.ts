import { NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/service';

export const dynamic = 'force-dynamic';

const ALLOWED_BUCKETS = ['candidates', 'cvs'] as const;
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXT = new Set(['pdf', 'doc', 'docx']);

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
    const bucketName = String(formData.get('bucket') ?? 'candidates');
    const jobId = formData.get('jobId') as string | null;
    console.log('Tentativo upload bucket:', bucketName, 'jobId:', jobId);

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'File mancante' }, { status: 400 });
    }

    if (!ALLOWED_BUCKETS.includes(bucketName as (typeof ALLOWED_BUCKETS)[number])) {
      return NextResponse.json({ error: 'Bucket non consentito' }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File troppo grande (max 5MB)' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_EXT.has(ext)) {
      return NextResponse.json({ error: 'Formato non supportato (PDF, DOC, DOCX)' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${ext}`;
    const filePath = bucketName === 'candidates'
      ? `cvs/${fileName}`
      : jobId
        ? `${jobId}/${fileName}`
        : fileName;

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

    const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(data.path);

    if (!publicUrl) {
      return NextResponse.json({ error: 'URL pubblico non disponibile' }, { status: 500 });
    }

    console.log('[upload-cv] OK:', { bucket: bucketName, path: data.path, publicUrl });

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
