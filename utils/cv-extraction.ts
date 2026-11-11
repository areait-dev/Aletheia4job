import { extractTextFromCV } from '@/lib/cvParser';
import { downloadCv } from '@/utils/cvStorage';

export async function extractTextFromUrl(url: string): Promise<{ text: string; success: boolean; error?: string }> {
  try {
    // `url` è il valore di Candidate.cvUrl (percorso nel bucket, vecchio URL pubblico o URL esterno).
    const buffer = await downloadCv(url);

    if (buffer.length === 0) {
      return { text: '', success: false, error: 'Il file scaricato è vuoto.' };
    }

    const extension = url.split('?')[0].split('.').pop()?.toLowerCase() || '';
    const mimeByExtension: Record<string, string> = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      doc: 'application/msword',
    };

    try {
      const text = await extractTextFromCV(buffer, mimeByExtension[extension]);
      return { text, success: true };
    } catch (e) {
      return { text: '', success: false, error: e instanceof Error ? e.message : 'File non leggibile.' };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Errore sconosciuto';
    return { text: '', success: false, error: message };
  }
}
