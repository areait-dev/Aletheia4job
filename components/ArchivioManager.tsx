"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getAllCandidatesAction } from "@/utils/actions";
import { ARCHIVE_PAGE_SIZE } from "@/utils/types";
import JobFolders from "./JobFolders";
import SectorFolders from "./SectorFolders";
import { Sparkles, Inbox, Loader2, SearchX } from "lucide-react";

export default function ArchivioManager() {
  const searchParams = useSearchParams();
  const search = searchParams.get("search") || "";
  const candidateStatus = searchParams.get("candidateStatus") || "tutti";
  const province = searchParams.get("province") || "tutte";

  // Paginazione reale: partiamo da ARCHIVE_PAGE_SIZE (stessa dimensione del
  // prefetch server in jobs/page.tsx, per evitare il mismatch di limit che
  // faceva mostrare un conteggio troncato) e la aumentiamo esplicitamente
  // con "Carica altri", mai in modo silenzioso.
  const [visibleLimit, setVisibleLimit] = useState(ARCHIVE_PAGE_SIZE);

  const { data, isPending, isFetching } = useQuery({
    queryKey: ["candidates-grouped", search, candidateStatus, province, visibleLimit],
    queryFn: () => getAllCandidatesAction({
      search,
      candidateStatus,
      province,
      limit: visibleLimit
    }),
  });

  if (isPending) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin opacity-20" />
        <p className="text-muted-foreground font-medium animate-pulse">Organizzando l'archivio...</p>
      </div>
    );
  }

  const candidates = data?.candidates || [];

  if (candidates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 bg-muted/20 rounded-[3rem] border border-dashed">
        <SearchX className="w-16 h-16 text-muted-foreground/20" />
        <div className="text-center">
          <h3 className="text-xl font-bold">Nessun candidato trovato</h3>
          <p className="text-muted-foreground">Prova a cambiare i filtri di ricerca.</p>
        </div>
      </div>
    );
  }

  // Separazione logica
  const automaticCandidates = candidates.filter(c => c.applications && c.applications.length > 0);
  const manualCandidates = candidates.filter(c => !c.applications || c.applications.length === 0);

  const totalInOrg = data?.count ?? candidates.length;
  const hasMore = candidates.length < totalInOrg;

  return (
    <div className="space-y-16">
      {/* SEZIONE 1: POSIZIONI APERTE */}
      <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 shadow-sm">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Posizioni Aperte (Career Page)</h2>
              <p className="text-sm text-muted-foreground">Candidature caricate automaticamente dai form online.</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/10 rounded-2xl">
            <span className="text-xs font-bold text-primary uppercase">Totale:</span>
            <span className="text-sm font-black text-primary">{automaticCandidates.length}</span>
          </div>
        </div>
        
        <div className="bg-primary/5 p-4 sm:p-8 rounded-[2.5rem] border border-primary/10 shadow-inner max-h-[600px] overflow-y-auto">
          <JobFolders candidates={automaticCandidates} />
        </div>
      </section>

      {/* SEZIONE 2: ARCHIVIO MANUALE */}
      <section className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-muted rounded-2xl border border-border shadow-sm">
              <Inbox className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Archivio Manuale (Per Settore)</h2>
              <p className="text-sm text-muted-foreground">Profili inseriti manualmente o archiviati per competenza.</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-muted border border-border rounded-2xl">
            <span className="text-xs font-bold text-muted-foreground uppercase">Totale:</span>
            <span className="text-sm font-black text-muted-foreground">{manualCandidates.length}</span>
          </div>
        </div>

        <div className="bg-muted/30 p-4 sm:p-8 rounded-[2.5rem] border border-border shadow-inner">
          <SectorFolders candidates={manualCandidates} />
        </div>
      </section>

      {hasMore && (
        <div className="flex flex-col items-center gap-2 pb-4">
          <p className="text-xs text-muted-foreground">
            Stai visualizzando {candidates.length} di {totalInOrg} candidati totali.
          </p>
          <button
            type="button"
            onClick={() => setVisibleLimit((v) => v + ARCHIVE_PAGE_SIZE)}
            disabled={isFetching}
            className="px-6 py-2.5 rounded-2xl border border-border bg-white hover:bg-muted/50 transition-colors text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isFetching ? "Caricamento..." : "Carica altri"}
          </button>
        </div>
      )}
    </div>
  );
}
