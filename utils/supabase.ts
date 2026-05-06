import { createClient } from '@/utils/supabase/client';

export const supabase = createClient();

/**
 * Carica un file PDF nel bucket 'cvs' di Supabase
 * @param file File da caricare
 * @returns URL pubblico del file caricato
 */
export async function uploadCV(file: File): Promise<{ url: string | null, error: string | null }> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = fileName;

    const { error: uploadError } = await supabase.storage
      .from('cvs')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('cvs')
      .getPublicUrl(filePath);

    return { url: publicUrl, error: null };
  } catch (error: any) {
    console.error('Errore durante l\'upload del CV:', error);
    return { url: null, error: error?.message || 'Errore sconosciuto' };
  }
}
