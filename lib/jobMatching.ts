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
  keywordScore: number; // 0-60
  sectorScore: number; // 0-15
  locationScore: number; // 0-10
  titleScore: number; // 0-15
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
    "candidati risorsa risorse attivita settore ruolo anni anno " +
    "diploma laurea titolo studio mansione mansioni principali gestionali preferenziale precisione " +
    "comunicative competenze capacita autonomia team lingue lingua requisiti richiesti buon buona ottima"
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

/**
 * Radice approssimata di una parola: toglie le vocali finali e tronca a 6
 * caratteri, cosi "docente/docenti/docenza" e "insegnante/insegnamento"
 * collassano sulla stessa radice.
 */
export function stem(token: string): string {
  if (token.length <= 4) return token;
  const noVowel = token.replace(/[aeiou]+$/, "");
  return (noVowel.length >= 4 ? noVowel : token).slice(0, 6);
}

/** Mappa radice -> prima parola originale (per mostrare parole leggibili). */
function stemMap(tokens: string[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const t of tokens) {
    const st = stem(t);
    if (!m.has(st)) m.set(st, t);
  }
  return m;
}

const GENERIC_SECTOR = new Set(["definire", "altro", "generale", "varie"]);

function sectorStems(text: string | null | undefined): Set<string> {
  return new Set(
    tokenize(text)
      .filter((t) => !GENERIC_SECTOR.has(t))
      .map(stem)
  );
}

function isRemote(job: MatchJob): "full" | "hybrid" | null {
  const t = normalize(`${job.remoteType ?? ""} ${job.mode ?? ""} ${job.location ?? ""}`);
  if (/(non|no)\s+remot|on ?site|in sede|in presenza/.test(t)) return null;
  if (/ibrid|hybrid/.test(t)) return "hybrid";
  if (/remot|smart ?working|da casa/.test(t)) return "full";
  return null;
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
  const candidateStems = new Set(tokenize(candidateText).map(stem));

  // Parole chiave dell'offerta (per radice): titolo, requisiti e mansioni.
  const jobTokens = Array.from(
    new Set(tokenize([job.title, job.requirements, job.responsibilities].filter(Boolean).join(" ")))
  );
  const jobStems = stemMap(jobTokens);
  const stemList = Array.from(jobStems.keys()).slice(0, 40);

  const matchedStems = stemList.filter((k) => candidateStems.has(k));
  const missingStems = stemList.filter((k) => !candidateStems.has(k));
  const rawKeywordScore = stemList.length ? (matchedStems.length / stemList.length) * 60 : 0;

  // Settore: sovrapposizione di radici ("Istruzione e Formazione" ~ "Formazione/Docenza").
  const cSector = sectorStems(candidate.sector);
  const jSector = new Set([...sectorStems(job.sector), ...sectorStems(job.category)]);
  const sectorScore = Array.from(cSector).some((s) => jSector.has(s)) ? 15 : 0;

  // Localita: la citta dell'offerta e spesso vuota, quindi si cerca la citta/provincia
  // del candidato anche nella sede e nel titolo dell'annuncio.
  const jobPlace = normalize(`${job.city ?? ""} ${job.location ?? ""} ${job.title}`);
  const cCity = normalize(candidate.city ?? "");
  const cProv = normalize(candidate.province ?? "");
  let locationScore = 0;
  const remote = isRemote(job);
  if (remote === "full") locationScore = 10;
  else if (cCity.length >= 3 && jobPlace.includes(cCity)) locationScore = 10;
  else if (remote === "hybrid") locationScore = 6;
  else if (cProv.length >= 2 && new RegExp(`\\b${cProv}\\b`).test(jobPlace)) locationScore = 6;

  // Ruolo del candidato vs titolo dell'offerta (per radice).
  const titleStems = Array.from(new Set(tokenize(job.title).map(stem)));
  const roleStems = new Set(tokenize(candidate.role).map(stem));
  const titleHits = titleStems.filter((t) => roleStems.has(t)).length;
  const titleScore = titleStems.length ? Math.round((titleHits / titleStems.length) * 15) : 0;

  // Senza alcun riscontro su settore o ruolo, le sole parole in comune (spesso
  // generiche, in CV molto lunghi) pesano meno.
  const keywordScore = Math.round(sectorScore === 0 && titleScore === 0 ? rawKeywordScore * 0.6 : rawKeywordScore);

  const score = Math.min(100, keywordScore + sectorScore + locationScore + titleScore);

  return {
    score,
    keywordScore,
    sectorScore,
    locationScore,
    titleScore,
    matchedKeywords: matchedStems.slice(0, 10).map((k) => jobStems.get(k)!),
    missingKeywords: missingStems.slice(0, 8).map((k) => jobStems.get(k)!),
  };
}
