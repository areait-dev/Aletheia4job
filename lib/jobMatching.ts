// Matching veloce candidato <-> offerta, senza AI: sovrapposizione di parole
// chiave, settore, localita e titolo. Funzioni pure, usabili lato server.

export type MatchCandidate = {
  role?: string | null;
  skills?: string | null;
  sector?: string | null;
  city?: string | null;
  province?: string | null;
  education?: string | null;
  resumeText?: string | null;
};

export type MatchJob = {
  title: string;
  sector?: string | null;
  category?: string | null;
  city?: string | null;
  province?: string | null;
  location?: string | null;
  remoteType?: string | null;
  mode?: string | null;
  requirements?: string | null;
  responsibilities?: string | null;
  description?: string | null;
};

export type MatchResult = {
  score: number; // 0-100
  keywordScore: number; // 0-55
  sectorScore: number; // 0-20
  locationScore: number; // 0-15
  titleScore: number; // 0-10
  matchedKeywords: string[];
  missingKeywords: string[];
};

const STOPWORDS = new Set(
  (
    "alla alle allo agli anche ancora che chi come con cui del della delle dei degli dello dal dalla dalle " +
    "nel nella nelle negli nei per tra fra una uno sul sulla sulle sono essere ogni oltre molto " +
    "piu suo sua suoi sue loro non gli le il lo la un in di da su al ai ed et ad se ma o e a i " +
    "the and for with from that this are was were you your our will have has can into more most over such " +
    "esperienza requisiti richiesta richiesto richiesti conoscenza capacita buona ottima ottimo buone " +
    "gradita gradito preferibile necessaria necessario lavoro azienda posizione ricerchiamo cerchiamo candidato " +
    "candidati risorsa risorse attivita settore ruolo anni anno"
  ).split(/\s+/)
);

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9+#\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(text: string | null | undefined): string[] {
  if (!text) return [];
  return normalize(text)
    .split(" ")
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t) && !/^\d+$/.test(t));
}

function includesEither(a: string, b: string): boolean {
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

export function scoreCandidateForJob(candidate: MatchCandidate, job: MatchJob): MatchResult {
  const candidateText = [
    candidate.role,
    candidate.skills,
    candidate.sector,
    candidate.education,
    candidate.resumeText,
  ]
    .filter(Boolean)
    .join(" ");
  const candidateTokens = new Set(tokenize(candidateText));

  // Parole chiave dell'offerta: titolo, requisiti e mansioni.
  const jobKeywordText = [job.title, job.requirements, job.responsibilities].filter(Boolean).join(" ");
  const jobKeywords = Array.from(new Set(tokenize(jobKeywordText))).slice(0, 40);

  const matched = jobKeywords.filter((k) => candidateTokens.has(k));
  const missing = jobKeywords.filter((k) => !candidateTokens.has(k));
  const keywordScore = jobKeywords.length ? Math.round((matched.length / jobKeywords.length) * 55) : 0;

  // Settore
  const cSector = normalize(candidate.sector ?? "");
  const jSectors = [job.sector, job.category].map((s) => normalize(s ?? "")).filter(Boolean);
  const sectorScore = jSectors.some((s) => includesEither(cSector, s)) ? 20 : 0;

  // Localita
  const cCity = normalize(candidate.city ?? "");
  const jCity = normalize(job.city ?? job.location ?? "");
  const remote = /remot/i.test(`${job.remoteType ?? ""} ${job.mode ?? ""}`);
  let locationScore = 0;
  if (remote) locationScore = 15;
  else if (cCity && jCity && includesEither(cCity, jCity)) locationScore = 15;
  else if (candidate.province && job.province && normalize(candidate.province) === normalize(job.province))
    locationScore = 8;

  // Ruolo del candidato vs titolo dell'offerta
  const titleTokens = Array.from(new Set(tokenize(job.title)));
  const roleTokens = new Set(tokenize(candidate.role));
  const titleHits = titleTokens.filter((t) => roleTokens.has(t)).length;
  const titleScore = titleTokens.length ? Math.round((titleHits / titleTokens.length) * 10) : 0;

  const score = Math.min(100, keywordScore + sectorScore + locationScore + titleScore);

  return {
    score,
    keywordScore,
    sectorScore,
    locationScore,
    titleScore,
    matchedKeywords: matched.slice(0, 10),
    missingKeywords: missing.slice(0, 8),
  };
}
