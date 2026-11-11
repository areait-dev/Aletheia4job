"use client";

import { useState } from "react";
import { Folder, FolderOpen, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { CandidateType } from "@/utils/types";
import CandidateRow from "./CandidateRow";

const PER_PAGE = 20;

// Cartella chiusa di default, con elenco compatto e "Mostra altri" locale.
export default function FolderGroup({
  title,
  candidates,
  subtitle,
  variant = "default",
  defaultOpen = false,
}: {
  title: string;
  candidates: CandidateType[];
  subtitle: string;
  variant?: "primary" | "default";
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [shown, setShown] = useState(PER_PAGE);
  const primary = variant === "primary";

  const latest = candidates.reduce<number>((m, c) => Math.max(m, new Date(c.createdAt).getTime() || 0), 0);

  return (
    <div className={cn("overflow-hidden rounded-2xl border", primary ? "border-primary/20 bg-white/40" : "border-border bg-muted/30")}>
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-3 hover:bg-white/60 transition-colors text-left">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-white rounded-xl shadow-sm">
            {isOpen ? (
              <FolderOpen className={cn("w-5 h-5", primary ? "text-primary" : "text-muted-foreground")} />
            ) : (
              <Folder className={cn("w-5 h-5", primary ? "text-primary" : "text-muted-foreground")} />
            )}
          </div>
          <div className="min-w-0">
            <span className="font-bold text-sm capitalize block truncate">{title}</span>
            <span className="text-[10px] text-muted-foreground font-medium uppercase">
              {candidates.length} {subtitle}
              {latest > 0 && ` · ultima ${new Date(latest).toLocaleDateString("it-IT")}`}
            </span>
          </div>
        </div>
        <ChevronDown className={cn("w-4 h-4 transition-transform", !isOpen && "-rotate-90")} />
      </button>

      {isOpen && (
        <div className="p-3 pt-0 space-y-1.5">
          {candidates.length === 0 ? (
            <p className="p-2 text-sm text-muted-foreground italic">Nessun candidato.</p>
          ) : (
            candidates.slice(0, shown).map((c) => <CandidateRow key={c.id} candidate={c} />)
          )}
          {candidates.length > shown && (
            <button
              type="button"
              onClick={() => setShown((s) => s + PER_PAGE)}
              className="w-full py-2 text-xs font-bold text-primary hover:bg-primary/5 rounded-xl"
            >
              Mostra altri ({candidates.length - shown})
            </button>
          )}
        </div>
      )}
    </div>
  );
}
