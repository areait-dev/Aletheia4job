import { Groq } from "groq-sdk";

/**
 * Funzioni AI condivise per parsing CV e matching score.
 * Usate sia dalle server action (utils/actions/ai.ts) sia dai job Inngest
 * (inngest/functions/cv-processing.ts), così il prompt è in un solo punto.
 */

export const AI_CV_MODEL = "openai/gpt-oss-120b";

export function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not defined in environment variables");
  }
  return new Groq({ apiKey });
}

export function isAiConfigured() {
  return Boolean(process.env.GROQ_API_KEY);
}

// ---------------------------------------------------------------------------
// Parsing CV
// ---------------------------------------------------------------------------

export type ParsedCV = {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  role: string | null;
  seniority: string | null;
  education: string | null;
  skills: string | null;
  sector: string | null;
};

const PARSE_SYSTEM_PROMPT = `Sei un assistente HR che estrae dati strutturati dai curriculum. Rispondi esclusivamente con un oggetto JSON valido.

REGOLE:
- Estrai solo informazioni presenti nel CV. Se un dato manca usa null. Non inventare nulla.
- firstName / lastName: nome e cognome del candidato.
- role: ruolo attuale o più recente (es. "Magazziniere", "Sviluppatore Frontend").
- seniority: uno tra "Junior", "Mid", "Senior", "Manager" in base agli anni di esperienza e al ruolo; null se non deducibile.
- education: titolo di studio più alto (es. "Laurea in Ingegneria Informatica", "Diploma di ragioneria").
- skills: competenze principali separate da virgola (max 15).
- sector: settore lavorativo prevalente (es. "Logistica", "IT", "Ristorazione").

FORMATO:
{"firstName": "", "lastName": "", "email": "", "phone": "", "city": "", "role": "", "seniority": "", "education": "", "skills": "", "sector": ""}`;

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "null") return null;
  return trimmed;
}

export async function parseCvWithAI(cvText: string): Promise<ParsedCV | null> {
  if (!cvText?.trim()) return null;

  const groq = getGroqClient();
  const response = await groq.chat.completions.create({
    model: AI_CV_MODEL,
    messages: [
      { role: "system", content: PARSE_SYSTEM_PROMPT },
      { role: "user", content: `CV:\n${cvText.substring(0, 8000)}` },
    ],
    response_format: { type: "json_object" },
    temperature: 0,
    reasoning_effort: "low",
    max_completion_tokens: 1024,
  });

  if (response.choices[0]?.finish_reason === "length") {
    throw new Error("Risposta AI troncata: aumentare max_completion_tokens");
  }

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Risposta AI vuota (parsing CV)");

  const raw = JSON.parse(content);
  return {
    firstName: cleanString(raw.firstName),
    lastName: cleanString(raw.lastName),
    email: cleanString(raw.email),
    phone: cleanString(raw.phone),
    city: cleanString(raw.city),
    role: cleanString(raw.role),
    seniority: cleanString(raw.seniority),
    education: cleanString(raw.education),
    skills: Array.isArray(raw.skills) ? cleanString(raw.skills.join(", ")) : cleanString(raw.skills),
    sector: cleanString(raw.sector),
  };
}

// ---------------------------------------------------------------------------
// Matching score
// ---------------------------------------------------------------------------

export type MatchingScoreResult = {
  matchingScore: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  recommendation: string;
};

type JobForMatching = {
  title: string | null;
  requirements: string | null;
  description: string | null;
};

const SCORE_SYSTEM_PROMPT = `Sei un esperto HR Senior. Valuti in modo oggettivo e coerente quanto un CV è compatibile con una posizione lavorativa. Rispondi esclusivamente con un oggetto JSON valido.

COME CALCOLARE matchingScore (intero 0-100), somma questi punteggi:
- Requisiti principali della posizione (competenze/abilitazioni indispensabili): 0-50
- Esperienza pertinente (anni e ruoli simili): 0-25
- Competenze aggiuntive utili / requisiti preferenziali: 0-15
- Formazione e certificazioni pertinenti: 0-10

REGOLE:
- Se manca anche un solo requisito indispensabile, matchingScore massimo 40.
- Valuta solo ciò che è scritto nel CV, non dedurre competenze non dichiarate.
- Ignora età, genere, nazionalità, foto, stato civile e qualsiasi dato non legato alle competenze.
- Fasce: 80-100 ottimo, 60-79 buono, 40-59 parziale, 0-39 non idoneo.

OUTPUT:
{
  "matchingScore": <intero 0-100>,
  "matchedKeywords": [max 10 competenze/requisiti della posizione presenti nel CV],
  "missingKeywords": [max 5 requisiti importanti della posizione assenti nel CV],
  "recommendation": "<frase in italiano, max 15 parole, coerente con la fascia>"
}`;

function toStringArray(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.trim())
    .slice(0, max);
}

export async function scoreCandidateWithAI(
  cvText: string,
  job: JobForMatching,
): Promise<MatchingScoreResult> {
  const groq = getGroqClient();

  const userPrompt = `POSIZIONE: ${job.title ?? ""}
REQUISITI: ${job.requirements ?? "non specificati"}
DESCRIZIONE: ${job.description ?? "non specificata"}

CV:
${cvText.substring(0, 8000)}`;

  const response = await groq.chat.completions.create({
    model: AI_CV_MODEL,
    messages: [
      { role: "system", content: SCORE_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0,
    reasoning_effort: "medium",
    max_completion_tokens: 2048,
  });

  if (response.choices[0]?.finish_reason === "length") {
    throw new Error("Risposta AI troncata: aumentare max_completion_tokens");
  }

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Risposta AI vuota (matching score)");

  const raw = JSON.parse(content);
  const score = Math.max(0, Math.min(100, Math.round(Number(raw.matchingScore) || 0)));

  return {
    matchingScore: score,
    matchedKeywords: toStringArray(raw.matchedKeywords, 10),
    missingKeywords: toStringArray(raw.missingKeywords, 5),
    recommendation: typeof raw.recommendation === "string" ? raw.recommendation.trim() : "",
  };
}
