import { NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/service';

export const dynamic = 'force-dynamic';

const ALLOWED_BUCKETS = ['candidates', 'cvs'] as const;
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXT = new Set(['pdf', 'doc', 'docx']);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const bucketParam = String(formData.get('bucket') ?? 'candidates');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'File mancante' }, { status: 400 });
    }

    if (!ALLOWED_BUCKETS.includes(bucketParam as (typeof ALLOWED_BUCKETS)[number])) {
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
    const filePath = bucketParam === 'candidates' ? `cvs/${fileName}` : fileName;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { data, error: uploadError } = await supabase.storage
      .from(bucketParam)
      .upload(filePath, buffer, {
        contentType: file.type || undefined,
        upsert: false,
      });

    if (uploadError) {
      console.error('[upload-cv] Supabase Upload Error:', {
        message: uploadError.message,
        name: uploadError.name,
        bucket: bucketParam,
        path: filePath,
        // @ts-expect-error — campi extra restituiti da Supabase Storage
        statusCode: uploadError.statusCode,
        error: uploadError,
      });
      return NextResponse.json(
        { error: uploadError.message || 'Upload fallito su Supabase Storage' },
        { status: uploadError.message?.includes('not found') ? 404 : 500 },
      );
    }

    if (!data?.path) {
      console.error('[upload-cv] Upload senza path restituito:', { bucket: bucketParam, data });
      return NextResponse.json({ error: 'Upload fallito: nessun percorso restituito' }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage.from(bucketParam).getPublicUrl(data.path);

    if (!publicUrl) {
      return NextResponse.json({ error: 'URL pubblico non disponibile' }, { status: 500 });
    }

    console.log('[upload-cv] OK:', { bucket: bucketParam, path: data.path, publicUrl });

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
