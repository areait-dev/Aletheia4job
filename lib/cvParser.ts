// lib/cvParser.ts
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export async function extractTextFromCV(fileBuffer: Buffer, mimeType: string): Promise<string> {
  try {
    if (mimeType === 'application/pdf') {
      const data = await pdfParse(fileBuffer);
      return data.text;
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      return result.value;
    } else if (mimeType === 'text/plain') {
      return fileBuffer.toString('utf-8');
    } else {
      throw new Error('Formato file non supportato. Usare PDF, DOCX o TXT.');
    }
  } catch (error) {
    console.error('Errore nel parsing del CV:', error);
    throw new Error('Impossibile leggere il contenuto del CV.');
  }
}