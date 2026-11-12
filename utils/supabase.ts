import { fileTooLargeMessage, isFileTooLarge } from '@/utils/uploadLimits';

/** `candidates` = form pubblico candidature; `cvs` = upload admin (CreateCandidateForm); `logos` = logo azienda cliente su annuncio */
export type CvUploadBucket = 'candidates' | 'cvs' | 'logos';

/**
 * Upload CV tramite API server (Service Role).
 * Usabile da componenti client — non espone la chiave di servizio.
 */
export async function uploadCV(
  file: File,
  options?: { bucket?: CvUploadBucket; jobId?: string },
): Promise<{ url: string | null; error: string | null }> {
  const bucket = options?.bucket ?? 'cvs';
  const jobId = options?.jobId;

  try {
    console.log('[uploadCV] Tentativo upload bucket:', bucket, 'jobId:', jobId);

    // Controllo prima dell'invio: oltre il limite Vercel rifiuta la richiesta senza un messaggio comprensibile.
    if (isFileTooLarge(file.size)) {
      return { url: null, error: fileTooLargeMessage(file.size, bucket === 'logos' ? 'logo' : 'CV') };
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', bucket);
    if (jobId) formData.append('jobId', jobId);

    const res = await fetch('/api/upload-cv', { method: 'POST', body: formData });
    const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };

    // 413 può arrivare dalla piattaforma (corpo non JSON) se il file supera il limite di Vercel.
    if (res.status === 413) {
      return { url: null, error: body.error || fileTooLargeMessage(file.size, bucket === 'logos' ? 'logo' : 'CV') };
    }

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
