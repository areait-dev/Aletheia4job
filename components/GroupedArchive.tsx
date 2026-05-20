"use client";

import { CandidateType } from "@/utils/types";
import { Sparkles, Inbox, Folder, FolderOpen, ChevronRight, ChevronDown } from "lucide-react";
import CandidateCard from "./JobCard";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface GroupedArchiveProps {
  candidates: CandidateType[];
}

export default function GroupedArchive({ candidates }: GroupedArchiveProps) {
  // 1. Separazione tra Automatici (Career Page) e Manuali
  const automaticCandidates = candidates.filter(c => c.applications && c.applications.length > 0);
  const manualCandidates = candidates.filter(c => !c.applications || c.applications.length === 0);

  // 2. Raggruppamento Automatici per Job Title
  const groupedByJob: Record<string, CandidateType[]> = {};
  automaticCandidates.forEach(c => {
    const jobTitle = c.applications?.[0]?.job?.title || "Posizione Sconosciuta";
    if (!groupedByJob[jobTitle]) groupedByJob[jobTitle] = [];
    groupedByJob[jobTitle].push(c);
  });

  // 3. Raggruppamento Manuali per Settore
  const groupedBySector: Record<string, CandidateType[]> = {};
  manualCandidates.forEach(c => {
    const sector = c.sector || "Generici";
    if (!groupedBySector[sector]) groupedBySector[sector] = [];
    groupedBySector[sector].push(c);
  });

  return (
    <div className="space-y-12">
      {/* SEZIONE 1: POSIZIONI APERTE */}
      <section className="space-y-6 p-1 sm:p-6 bg-primary/5 rounded-[2rem] border border-primary/10 shadow-sm transition-all duration-500">
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-xl">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-primary tracking-tight">🔥 Posizioni Aperte</h2>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Candidature da Career Page</p>
            </div>
          </div>
          <div className="text-xs font-bold bg-primary/10 text-primary px-3 py-1 rounded-full">
            {automaticCandidates.length} CANDIDATI
          </div>
        </div>

        <div className="space-y-4">
          {Object.keys(groupedByJob).length === 0 ? (
            <p className="text-center py-8 text-muted-foreground italic">Nessun candidato arrivato automaticamente.</p>
          ) : (
            Object.entries(groupedByJob).map(([jobTitle, items]) => (
              <FolderGroup key={jobTitle} title={jobTitle} candidates={items} variant="primary" />
            ))
          )}
        </div>
      </section>

      {/* SEZIONE 2: ARCHIVIO MANUALE */}
      <section className="space-y-6 p-1 sm:p-6 bg-card rounded-[2rem] border border-border shadow-sm transition-all duration-500">
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-xl">
              <Inbox className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">📂 Archivio Manuale</h2>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Gestione per Settore</p>
            </div>
          </div>
          <div className="text-xs font-bold bg-muted text-muted-foreground px-3 py-1 rounded-full">
            {manualCandidates.length} CANDIDATI
          </div>
        </div>

        <div className="space-y-4">
          {Object.keys(groupedBySector).length === 0 ? (
            <p className="text-center py-8 text-muted-foreground italic">Nessun candidato inserito manualmente.</p>
          ) : (
            Object.entries(groupedBySector).map(([sector, items]) => (
              <FolderGroup key={sector} title={sector} candidates={items} variant="default" />
            ))
          )}
        </div>
      </section>
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
        className="w-full flex items-center justify-between p-4 hover:bg-white/60 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isOpen ? (
            <FolderOpen className={cn("w-5 h-5", variant === 'primary' ? "text-primary" : "text-muted-foreground")} />
          ) : (
            <Folder className={cn("w-5 h-5", variant === 'primary' ? "text-primary" : "text-muted-foreground")} />
          )}
          <span className="font-bold text-sm tracking-tight capitalize">{title}</span>
          <span className="text-[10px] bg-white/80 px-2 py-0.5 rounded-full font-bold shadow-sm">
            {candidates.length}
          </span>
        </div>
        <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", !isOpen && "-rotate-90")} />
      </button>

      {isOpen && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch animate-in fade-in slide-in-from-top-2 duration-300">
          {candidates.map(candidate => (
            <CandidateCard key={candidate.id} candidate={candidate} />
          ))}
        </div>
      )}
    </div>
  );
}
