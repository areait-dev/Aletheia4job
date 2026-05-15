import axios from 'axios';

export async function extractTextFromUrl(url: string): Promise<string> {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);

    const extension = url.split('.').pop()?.toLowerCase();

    if (extension === 'pdf') {
      // Lazy load pdf-parse
      const pdf = (await import('pdf-parse')).default;
      const data = await pdf(buffer);
      return data.text;
    } else if (extension === 'docx' || extension === 'doc') {
      // Lazy load mammoth
      const mammoth = await import('mammoth');
      const { value } = await mammoth.extractRawText({ buffer });
      return value;
    }

    return '';
  } catch (error) {
    console.error('Error extracting text from CV:', error);
    return '';
  }
}
