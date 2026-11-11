'use client';

import { CandidateType } from "@/utils/types";
import FolderGroup from "./FolderGroup";

// Raggruppamento per settore, cartelle chiuse di default. Ricerca, sede e
// ordinamento sono gestiti a monte da ArchivioManager.
function SectorFolders({ candidates }: { candidates: CandidateType[] }) {
  const bySector: Record<string, CandidateType[]> = {};
  candidates.forEach((c) => {
    (bySector[c.sector || "Generici"] ||= []).push(c);
  });
  const sectors = Object.entries(bySector).sort((a, b) => b[1].length - a[1].length);

  if (sectors.length === 0) {
    return <p className="text-center py-8 text-sm text-muted-foreground italic">Nessun candidato.</p>;
  }

  return (
    <div className="space-y-3">
      {sectors.map(([sector, items]) => (
        <FolderGroup key={sector} title={sector} candidates={items} subtitle="profili" />
      ))}
    </div>
  );
}

export default SectorFolders;
