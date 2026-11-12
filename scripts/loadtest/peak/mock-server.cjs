/**
 * Server finto per la simulazione del picco di CV (SOLO TEST, nessun dato reale).
 *  - Imita Groq: POST /openai/v1/chat/completions con limite di richieste al minuto (finestra mobile di 60 s):
 *    oltre il limite risponde 429 con intestazione Retry-After, come fa Groq.
 *  - Imita lo Storage di Supabase: GET /storage/v1/object/... restituisce un PDF di prova con testo realistico.
 *  - GET /stats: contatori e picco di chiamate AI contemporanee. POST /reset: azzera.
 *
 *   node scripts/loadtest/peak/mock-server.cjs --port=4010 --rpm=100 --min-ms=2000 --max-ms=4000
 */
const http = require('http');
const { jsPDF } = require('jspdf');

const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? Number(a.split('=')[1]) : d; };
const PORT = arg('port', 4010);
const RPM = arg('rpm', 100);
const MIN_MS = arg('min-ms', 2000);
const MAX_MS = arg('max-ms', 4000);

// PDF di prova con ~7.000 caratteri di testo (come un CV medio reale)
function makePdf() {
  const words = 'esperienza lavoro responsabile gestione cliente progetto team obiettivi risultati formazione competenze azienda attivita sviluppo analisi supporto coordinamento processi qualita vendita logistica amministrazione'.split(' ');
  let s = 0; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const doc = new jsPDF();
  doc.setFontSize(10);
  let text = 'Mario Rossi - Curriculum Vitae\nEmail: mario.rossi@example.invalid  Tel: 3331234567\n\n';
  while (text.length < 7000) { text += words[Math.floor(rnd() * words.length)] + (rnd() < 0.08 ? '.\n' : ' '); }
  const lines = doc.splitTextToSize(text, 180);
  let y = 12;
  for (const line of lines) { if (y > 285) { doc.addPage(); y = 12; } doc.text(line, 15, y); y += 5; }
  return Buffer.from(doc.output('arraybuffer'));
}
const PDF = makePdf();

const stats = { aiCalls: 0, ai200: 0, ai429: 0, inFlight: 0, maxInFlight: 0, storageDownloads: 0, byMinute: {} };
let window = []; // istanti delle richieste accettate negli ultimi 60 s

function reset() { Object.assign(stats, { aiCalls: 0, ai200: 0, ai429: 0, inFlight: 0, maxInFlight: 0, storageDownloads: 0, byMinute: {} }); window = []; }

function bump(kind) {
  const m = new Date().toISOString().slice(11, 16);
  stats.byMinute[m] = stats.byMinute[m] || { ok: 0, rate429: 0 };
  stats.byMinute[m][kind]++;
}

const server = http.createServer((req, res) => {
  const url = req.url || '';
  if (url === '/health') { res.end('ok'); return; }
  if (url === '/stats') { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(stats)); return; }
  if (url === '/reset' && req.method === 'POST') { reset(); res.end('reset'); return; }

  if (url.startsWith('/storage/v1/object/')) {
    stats.storageDownloads++;
    res.writeHead(200, { 'content-type': 'application/pdf', 'content-length': PDF.length });
    res.end(PDF);
    return;
  }

  if (url.startsWith('/openai/v1/chat/completions') && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      stats.aiCalls++;
      const now = Date.now();
      window = window.filter((t) => now - t < 60000);
      if (window.length >= RPM) {
        stats.ai429++; bump('rate429');
        const retryAfter = Math.max(1, Math.ceil((window[0] + 60000 - now) / 1000));
        res.writeHead(429, { 'content-type': 'application/json', 'retry-after': String(retryAfter) });
        res.end(JSON.stringify({ error: { message: `Rate limit reached for model. Limit ${RPM}, Please try again in ${retryAfter}s.`, type: 'requests', code: 'rate_limit_exceeded' } }));
        return;
      }
      window.push(now);
      stats.inFlight++; stats.maxInFlight = Math.max(stats.maxInFlight, stats.inFlight);
      const isParse = /estrae dati strutturati/i.test(body);
      const delay = MIN_MS + Math.random() * (MAX_MS - MIN_MS);
      setTimeout(() => {
        stats.inFlight--; stats.ai200++; bump('ok');
        const content = isParse
          ? JSON.stringify({ firstName: 'Mario', lastName: 'Rossi', email: 'mario.rossi@example.invalid', phone: '3331234567', city: 'Milano', role: 'Impiegato', seniority: 'Mid', education: 'Diploma', skills: 'gestione, vendita', sector: 'Commercio' })
          : JSON.stringify({ matchingScore: 62, matchedKeywords: ['gestione', 'cliente'], missingKeywords: ['inglese'], recommendation: 'Profilo parzialmente compatibile con la posizione.' });
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ id: 'mock', object: 'chat.completion', model: 'mock', choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content } }], usage: { prompt_tokens: 2000, completion_tokens: 600, total_tokens: 2600 } }));
      }, delay);
    });
    return;
  }
  res.writeHead(404); res.end('not found');
});
server.listen(PORT, '127.0.0.1', () => console.log(`mock pronto su ${PORT} (rpm=${RPM}, latenza ${MIN_MS}-${MAX_MS} ms, pdf ${PDF.length} byte)`));
