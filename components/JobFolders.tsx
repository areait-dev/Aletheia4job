'use client';

import { CandidateType } from "@/utils/types";
import FolderGroup from "./FolderGroup";

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

  return (
    <div className="space-y-3">
      {longList.length > 0 && (
        <FolderGroup title="Long List" candidates={longList} subtitle="iscritti" variant="primary" />
      )}
      {jobs.map(([title, items]) => (
        <FolderGroup key={title} title={title} candidates={items} subtitle="candidature" variant="primary" />
      ))}
    </div>
  );
}

export default JobFolders;
