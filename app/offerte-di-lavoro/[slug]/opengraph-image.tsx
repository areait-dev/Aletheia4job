import { ImageResponse } from 'next/og';
import { getPublicJobByIdAction, resolvePublicJobSlugAction } from '@/utils/actions';

// Prisma richiede Node.js (connessione TCP al DB), non funziona su edge.
export const runtime = 'nodejs';

export const alt = 'Offerta di lavoro - Aletheia4Job';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Font esplicito per un rendering coerente (peso/stile) invece di affidarsi
// al fallback di default di @vercel/og. Nota: su Windows il fallback interno
// di @vercel/og ha un bug di risoluzione path (non legato a questo font
// esplicito) che rompe ImageResponse in sviluppo locale; non si presenta
// su Vercel (Linux), dove gira in produzione.
let interFontPromise: Promise<ArrayBuffer> | null = null;
function loadInterFont(): Promise<ArrayBuffer> {
  if (!interFontPromise) {
    interFontPromise = (async () => {
      const cssRes = await fetch(
        'https://fonts.googleapis.com/css2?family=Inter:wght@700&display=swap',
        // UA "legacy" per farsi restituire da Google Fonts un formato
        // (woff/ttf) supportato da satori invece del woff2 moderno.
        { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Trident/7.0; rv:11.0) like Gecko' } }
      );
      const css = await cssRes.text();
      const fontUrl = css.match(/src: url\(([^)]+)\) format\('(?:truetype|opentype|woff)'\)/)?.[1];
      if (!fontUrl) throw new Error('Font URL non trovato');
      const fontRes = await fetch(fontUrl);
      return fontRes.arrayBuffer();
    })();
  }
  return interFontPromise;
}

// Il logo viene mostrato in un riquadro di 72x72px nell'immagine OG: un file
// sorgente molto pesante (es. logo caricato ad alta risoluzione) non migliora
// la resa a quella dimensione, ma appesantisce inutilmente il rendering
// (decodifica/base64) e il rischio di superare i limiti di peso di alcuni
// crawler (es. WhatsApp). Sopra questa soglia si ricade sul design senza logo.
const MAX_LOGO_SOURCE_BYTES = 1_000_000; // 1MB

async function fetchLogoDataUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const type = res.headers.get('content-type') ?? '';
    if (!type.startsWith('image/')) return null;
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > MAX_LOGO_SOURCE_BYTES) return null;
    return `data:${type};base64,${Buffer.from(buffer).toString('base64')}`;
  } catch {
    // Logo non raggiungibile o non valido: si ricade sul design senza logo.
    return null;
  }
}

export default async function Image({ params }: { params: { slug: string } }) {
  const resolved = await resolvePublicJobSlugAction(params.slug);
  const job = resolved ? await getPublicJobByIdAction(resolved.id) : null;

  const title = job?.title ?? 'Offerta di Lavoro';
  const company = job?.company ?? 'Aletheia4Job';
  const location = job?.location ?? '';
  const [logoDataUrl, interFontData] = await Promise.all([
    fetchLogoDataUrl(job?.companyLogoUrl),
    loadInterFont().catch(() => null),
  ]);

  const displayTitle = title.length > 90 ? `${title.slice(0, 90).trimEnd()}…` : title;

  const imageResponse = new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px',
          // Gradiente a 2 stop invece di 3: stessa identità visiva (navy -> teal)
          // ma con una transizione tonale più semplice, che il PNG (lossless)
          // comprime meglio rispetto a un gradiente a più stop.
          background: 'linear-gradient(135deg, #0b1120 0%, #0d9488 100%)',
          color: '#ffffff',
          fontFamily: interFontData ? 'Inter' : 'sans-serif',
        }}
      >
        {/* Header: wordmark + logo azienda (se disponibile) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'flex', width: 16, height: 16, borderRadius: 999, background: '#2dd4bf' }} />
            <div style={{ display: 'flex', fontSize: 28, fontWeight: 700, letterSpacing: 2, color: '#e2fbf8' }}>
              ALETHEIA4JOB
            </div>
          </div>
          {logoDataUrl && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 96,
                height: 96,
                borderRadius: 20,
                background: '#ffffff',
                padding: 12,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoDataUrl} width={72} height={72} style={{ objectFit: 'contain' }} />
            </div>
          )}
        </div>

        {/* Corpo: titolo posizione + azienda/sede */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 980 }}>
          <div style={{ display: 'flex', fontSize: 56, fontWeight: 800, lineHeight: 1.15, color: '#ffffff' }}>
            {displayTitle}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 30, color: '#a7f3ec' }}>
            <span style={{ display: 'flex' }}>{company}</span>
            {location && (
              <>
                <span style={{ display: 'flex', opacity: 0.6 }}>•</span>
                <span style={{ display: 'flex' }}>{location}</span>
              </>
            )}
          </div>
        </div>

        {/* Footer: call to action */}
        <div style={{ display: 'flex' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '14px 28px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.25)',
              fontSize: 24,
              fontWeight: 600,
              color: '#ffffff',
            }}
          >
            Candidati ora su aletheia4job.it
          </div>
        </div>
      </div>
    ),
    {
      width: size.width,
      height: size.height,
      fonts: interFontData
        ? [{ name: 'Inter', data: interFontData, style: 'normal', weight: 700 }]
        : undefined,
    }
  );

  // WhatsApp (e altri crawler) scartano silenziosamente le immagini servite in
  // streaming chunked senza Content-Length esplicito. ImageResponse di @vercel/og
  // restituisce di default un body in streaming senza questo header: bufferizziamo
  // qui il PNG completo e lo serviamo con Content-Length calcolato esplicitamente.
  const buffer = await imageResponse.arrayBuffer();
  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(buffer.byteLength),
      'Cache-Control': imageResponse.headers.get('cache-control') ?? 'public, immutable, no-transform, max-age=31536000',
    },
  });
}
