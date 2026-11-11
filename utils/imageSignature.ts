// Riconoscimento del tipo di immagine dai primi byte (firma del file), indipendente dall'estensione.
// Serve a impedire che nel bucket pubblico `logos` finiscano PDF, documenti Office o altri file
// rinominati con estensione immagine.
export type ImageType = 'png' | 'jpeg' | 'webp' | 'svg';

export function detectImageType(buf: Uint8Array): ImageType | null {
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && // RIFF
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50   // WEBP
  ) return 'webp';
  // SVG: testo XML che contiene un elemento <svg, senza script né gestori di eventi.
  const head = Buffer.from(buf.subarray(0, Math.min(buf.length, 4096))).toString('utf8').trimStart().toLowerCase();
  if ((head.startsWith('<?xml') || head.startsWith('<svg') || head.startsWith('<!doctype svg')) && head.includes('<svg')) {
    const all = Buffer.from(buf).toString('utf8').toLowerCase();
    if (/<script|javascript:|\son[a-z]+\s*=|<foreignobject|<iframe|<embed/.test(all)) return null;
    return 'svg';
  }
  return null;
}

/** Estensioni coerenti con il tipo rilevato. */
export const EXT_FOR_TYPE: Record<ImageType, string[]> = {
  png: ['png'],
  jpeg: ['jpg', 'jpeg'],
  webp: ['webp'],
  svg: ['svg'],
};
