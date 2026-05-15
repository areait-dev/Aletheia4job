export type CvUploadBucket = 'candidates' | 'cvs';

/**
 * Upload CV tramite API server (Service Role).
 * Usabile da componenti client — non espone la chiave di servizio.
 */
export async function uploadCV(
  file: File,
  options?: { bucket?: CvUploadBucket },
): Promise<{ url: string | null; error: string | null }> {
  const bucket = options?.bucket ?? 'cvs';

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', bucket);

    const res = await fetch('/api/upload-cv', { method: 'POST', body: formData });
    const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };

    if (!res.ok) {
      console.error('[uploadCV] API error:', {
        status: res.status,
        statusText: res.statusText,
        bucket,
        error: body.error,
        body,
      });
      return { url: null, error: body.error || `Upload fallito (HTTP ${res.status})` };
    }

    if (!body.url) {
      console.error('[uploadCV] Risposta senza URL:', body);
      return { url: null, error: 'URL non restituito dal server' };
    }

    console.log('[uploadCV] OK:', { bucket, url: body.url });
    return { url: body.url, error: null };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Errore sconosciuto';
    console.error('[uploadCV] Unexpected error:', { bucket, message, error });
    return { url: null, error: message };
  }
}
