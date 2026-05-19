import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

const MAX_BUFFER_SIZE = 15 * 1024 * 1024;
const OCR_MIN_TEXT_LENGTH = 80;

function sanitizeText(text: string): string {
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\t ]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[^\S\n]+$/gm, '')
    .replace(/^[^\S\n]+/gm, '')
    .trim();
}

function detectMimeType(buffer: Buffer): string | null {
  const hex = buffer.subarray(0, 8).toString('hex');
  if (hex.startsWith('25504446')) return 'application/pdf';
  if (hex.startsWith('504b')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  return null;
}

async function ocrFallback(buffer: Buffer, pageLimit = 1): Promise<string> {
  try {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('ita+eng', 1, {
      logger: () => {},
    });
    const { data } = await worker.recognize(buffer);
    await worker.terminate();
    return (data.text || '').trim();
  } catch (error) {
    console.warn('[cvParser] OCR fallback non disponibile:', error);
    return '';
  }
}

export async function extractTextFromCV(fileBuffer: Buffer, mimeType?: string): Promise<string> {
  if (fileBuffer.length === 0) {
    throw new Error('Il file CV è vuoto.');
  }

  if (fileBuffer.length > MAX_BUFFER_SIZE) {
    throw new Error(`File troppo grande (max ${MAX_BUFFER_SIZE / 1024 / 1024}MB).`);
  }

  const resolvedMime = mimeType || detectMimeType(fileBuffer) || 'application/octet-stream';

  try {
    let text = '';

    if (resolvedMime === 'application/pdf') {
      const data = await pdfParse(fileBuffer);
      text = data.text || '';

      if (text.trim().length < OCR_MIN_TEXT_LENGTH) {
        console.log('[cvParser] PDF scannerizzato rilevato, avvio OCR fallback...');
        const ocrText = await ocrFallback(fileBuffer);
        if (ocrText.length > text.trim().length) {
          text = ocrText;
        }
      }

      (data as any) = null;
    } else if (resolvedMime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      text = result.value || '';
    } else if (resolvedMime === 'application/msword') {
      try {
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        text = result.value || '';
      } catch {
        text = fileBuffer.toString('utf-8');
      }
    } else if (resolvedMime === 'text/plain') {
      text = fileBuffer.toString('utf-8');
    } else {
      const detected = detectMimeType(fileBuffer);
      if (detected) {
        return extractTextFromCV(fileBuffer, detected);
      }
      throw new Error('Formato file non supportato. Usare PDF, DOCX o TXT.');
    }

    return sanitizeText(text);
  } catch (error) {
    console.error('[cvParser] Errore nel parsing del CV:', error);
    throw new Error('Impossibile leggere il contenuto del CV.');
  }
}
