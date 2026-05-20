'use client';

import { CandidateType } from "@/utils/types";
import { Folder, FolderOpen, ChevronDown } from "lucide-react";
import CandidateCard from "./JobCard";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface SectorFoldersProps {
  candidates: CandidateType[];
}

function SectorFolders({ candidates }: SectorFoldersProps) {
  // Raggruppamento per Settore
  const groupedBySector: Record<string, CandidateType[]> = {};
  candidates.forEach(c => {
    const sector = c.sector || "Generici";
    if (!groupedBySector[sector]) groupedBySector[sector] = [];
    groupedBySector[sector].push(c);
  });

  if (candidates.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/20 rounded-3xl border border-dashed">
        <p className="text-muted-foreground italic">Nessun candidato manuale trovato.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(groupedBySector).map(([sector, items]) => (
        <FolderGroup key={sector} title={sector} candidates={items} variant="default" />
      ))}
    </div>
  );
}

function FolderGroup({ title, candidates, variant }: { title: string, candidates: CandidateType[], variant: 'primary' | 'default' }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className={cn(
      "overflow-hidden rounded-3xl border transition-all duration-300",
      variant === 'primary' ? "border-primary/20 bg-white/40" : "border-border bg-muted/30"
    )}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/60 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-xl shadow-sm">
            {isOpen ? (
              <FolderOpen className={cn("w-5 h-5", variant === 'primary' ? "text-primary" : "text-muted-foreground")} />
            ) : (
              <Folder className={cn("w-5 h-5", variant === 'primary' ? "text-primary" : "text-muted-foreground")} />
            )}
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight capitalize block">{title}</span>
            <span className="text-[10px] text-muted-foreground font-medium uppercase">{candidates.length} profili archiviati</span>
          </div>
        </div>
        <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", !isOpen && "-rotate-90")} />
      </button>

      {isOpen && (
        <div className="p-4 grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch animate-in fade-in slide-in-from-top-2 duration-300">
          {candidates.map(candidate => (
            <CandidateCard key={candidate.id} candidate={candidate} />
          ))}
        </div>
      )}
    </div>
  );
}

export default SectorFolders;
