export async function extractTextFromUrl(url: string): Promise<{ text: string; success: boolean; error?: string }> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Impossibile scaricare il file: ${response.status} ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    if (buffer.length === 0) {
      return { text: '', success: false, error: 'Il file scaricato è vuoto.' };
    }

    const extension = url.split('.').pop()?.toLowerCase() || '';

    if (extension === 'pdf') {
      try {
        const { PDFParse } = await import('pdf-parse');
        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        await parser.destroy();
        return { text: result.text, success: true };
      } catch (e) {
        console.error('[extractTextFromUrl] pdf-parse error:', e);
        return { text: '', success: false, error: e instanceof Error ? e.message : 'PDF non leggibile' };
      }
    } else if (extension === 'docx' || extension === 'doc') {
      try {
        const mammoth = await import('mammoth');
        const { value } = await mammoth.extractRawText({ buffer });
        return { text: value || '', success: true };
      } catch {
        return { text: '', success: false, error: 'Documento Word non leggibile.' };
      }
    }

    return { text: '', success: false, error: 'Formato file non supportato.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Errore sconosciuto';
    return { text: '', success: false, error: message };
  }
}
