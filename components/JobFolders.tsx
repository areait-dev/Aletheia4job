'use client';

import { CandidateType } from "@/utils/types";
import { Folder, FolderOpen, ChevronDown, Sparkles } from "lucide-react";
import CandidateCard from "./JobCard";
import { useState } from "react";
import { cn } from "@/lib/utils";

export const TEACHER_SOURCE = "Long List Docenti";
const LONG_LIST_TITLE = "Long List";

interface JobFoldersProps {
  candidates: CandidateType[];
}

function JobFolders({ candidates }: JobFoldersProps) {
  // Raggruppamento per Job Title
  // Stesso valore di TEACHER_SOURCE in utils/teacherLongList.ts, duplicato per
  // non portare zod nel bundle client. La cartella "Long List" va sempre in
  // cima (le chiavi oggetto non numeriche mantengono l'ordine di inserimento).
  const groupedByJob: Record<string, CandidateType[]> = { [LONG_LIST_TITLE]: [] };
  candidates.forEach(c => {
    if (c.source === TEACHER_SOURCE) {
      groupedByJob[LONG_LIST_TITLE].push(c);
      return;
    }
    const jobTitle = c.applications?.[0]?.job?.title || "Posizione Sconosciuta";
    if (!groupedByJob[jobTitle]) groupedByJob[jobTitle] = [];
    groupedByJob[jobTitle].push(c);
  });

  return (
    <div className="space-y-4">
      {Object.entries(groupedByJob).filter(([title, items]) => title === LONG_LIST_TITLE || items.length > 0).map(([jobTitle, items]) => (
        <FolderGroup key={jobTitle} title={jobTitle} candidates={items} variant="primary" />
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
            <span className="text-[10px] text-muted-foreground font-medium uppercase">{candidates.length} candidature ricevute</span>
          </div>
        </div>
        <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", !isOpen && "-rotate-90")} />
      </button>

      {isOpen && (
        candidates.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground italic">Nessuna candidatura ricevuta.</p>
        ) : (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch animate-in fade-in slide-in-from-top-2 duration-300">
            {candidates.map(candidate => (
              <CandidateCard key={candidate.id} candidate={candidate} />
            ))}
          </div>
        )
      )}
    </div>
  );
}

export default JobFolders;
