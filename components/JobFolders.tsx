'use client';

import { CandidateType } from "@/utils/types";
import FolderGrid from "./FolderGrid";

export const TEACHER_SOURCE = "Long List Docenti";

// Un candidato già in archivio che si iscrive alla Long List mantiene la
// fonte originale, ma riceve in `notes` il blocco "[Long List Docenti — ...]".
export function isLongListCandidate(c: { source?: string | null; notes?: string | null }) {
  return c.source === TEACHER_SOURCE || !!c.notes?.includes(`[${TEACHER_SOURCE}`);
}

// Raggruppamento per posizione (titolo del job). Le cartelle sono chiuse di
// default; la Long List, se presente, va in cima.
function JobFolders({ candidates }: { candidates: CandidateType[] }) {
  const longList: CandidateType[] = [];
  const byJob: Record<string, CandidateType[]> = {};
  candidates.forEach((c) => {
    if (isLongListCandidate(c)) {
      longList.push(c);
      return;
    }
    const title = c.applications?.[0]?.job?.title || "Posizione Sconosciuta";
    (byJob[title] ||= []).push(c);
  });

  const jobs = Object.entries(byJob).sort((a, b) => b[1].length - a[1].length);

  if (longList.length === 0 && jobs.length === 0) {
    return <p className="text-center py-8 text-sm text-muted-foreground italic">Nessuna candidatura.</p>;
  }

  const folders = [
    ...(longList.length > 0 ? [{ title: "Long List", candidates: longList, primary: true }] : []),
    ...jobs.map(([title, candidates]) => ({ title, candidates, primary: true })),
  ];
  return <FolderGrid folders={folders} subtitle="candidature" />;
}

export default JobFolders;
