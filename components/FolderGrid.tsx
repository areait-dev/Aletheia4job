"use client";

import { useState } from "react";
import { Folder, FolderOpen, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CandidateType } from "@/utils/types";
import CandidateRow from "./CandidateRow";

const PER_PAGE = 20;

export interface FolderItem {
  title: string;
  candidates: CandidateType[];
  primary?: boolean;
}

// Cartelle come tessere in griglia; cliccandone una, il contenuto si apre
// sotto la griglia in un pannello unico (una sola cartella aperta alla volta).
export default function FolderGrid({ folders, subtitle }: { folders: FolderItem[]; subtitle: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [shown, setShown] = useState(PER_PAGE);
  const current = folders.find((f) => f.title === selected) ?? null;

  const select = (title: string) => {
    setShown(PER_PAGE);
    setSelected((s) => (s === title ? null : title));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {folders.map((f) => {
          const active = f.title === selected;
          const Icon = active ? FolderOpen : Folder;
          return (
            <button
              key={f.title}
              type="button"
              onClick={() => select(f.title)}
              className={cn(
                "flex flex-col items-start gap-2 p-3 rounded-2xl border text-left transition-all hover:shadow-sm",
                active ? "border-primary bg-primary/10" : f.primary ? "border-primary/20 bg-white/60 hover:border-primary/40" : "border-border bg-white hover:border-primary/30"
              )}
            >
              <div className="flex items-center justify-between w-full">
                <Icon className={cn("w-6 h-6", f.primary || active ? "text-primary" : "text-muted-foreground")} />
                <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-muted">{f.candidates.length}</span>
              </div>
              <span className="font-bold text-sm capitalize leading-tight line-clamp-2 w-full">{f.title}</span>
            </button>
          );
        })}
      </div>

      {current && (
        <div className="rounded-2xl border border-primary/20 bg-white/60 p-3 space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between px-1 pb-1">
            <div>
              <h3 className="font-bold text-sm capitalize">{current.title}</h3>
              <p className="text-[10px] uppercase text-muted-foreground font-medium">
                {current.candidates.length} {subtitle}
              </p>
            </div>
            <button type="button" onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-muted" aria-label="Chiudi">
              <X className="w-4 h-4" />
            </button>
          </div>
          {current.candidates.slice(0, shown).map((c) => (
            <CandidateRow key={c.id} candidate={c} />
          ))}
          {current.candidates.length > shown && (
            <button type="button" onClick={() => setShown((s) => s + PER_PAGE)} className="w-full py-2 text-xs font-bold text-primary hover:bg-primary/5 rounded-xl">
              Mostra altri ({current.candidates.length - shown})
            </button>
          )}
        </div>
      )}
    </div>
  );
}
