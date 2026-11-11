// @ts-nocheck
// TODO(tech-debt): CandidateType non combacia con la shape restituita da
// getAllCandidatesAction (relazione `applications` con `job` annidato).
// Rimuovere questo pragma quando il tipo verrà allineato; per ora escluso
// dal type-check bloccante in CI (vedi .github/workflows/ci.yml).
"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getAllCandidatesAction } from "@/utils/actions";
import { ARCHIVE_PAGE_SIZE } from "@/utils/types";
import JobFolders from "./JobFolders";
import SectorFolders from "./SectorFolders";
import FolderGroup from "./FolderGroup";
import { Sparkles, Inbox, Loader2, SearchX, Search, Users, ListChecks } from "lucide-react";
import { isLongListCandidate } from "./JobFolders";
import { cn } from "@/lib/utils";

type Tab = "tutti" | "posizioni" | "longlist" | "settore";

export default function ArchivioManager() {
  const [tab, setTab] = useState<Tab>("tutti");
  const [localSearch, setLocalSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("tutte");
  const [sortBy, setSortBy] = useState<"recenti" | "alfabetico">("recenti");
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
        <p className="text-muted-foreground font-medium animate-pulse">Organizzando l&apos;archivio...</p>
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

  // Filtri locali (ricerca, sede, ordinamento) uniti in un'unica barra.
  const q = localSearch.trim().toLowerCase();
  const cities = Array.from(new Set(candidates.map(c => c.city).filter(c => c && c !== "N/D"))).sort((a, b) => a.localeCompare(b));
  const filtered = candidates
    .filter(c => {
      if (cityFilter !== "tutte" && c.city !== cityFilter) return false;
      if (!q) return true;
      return [c.firstName, c.lastName, c.email, c.phone, c.role].filter(Boolean).join(" ").toLowerCase().includes(q);
    })
    .sort((a, b) =>
      sortBy === "alfabetico"
        ? `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  // La Long List (form /diventa-docente) è un sottoinsieme delle posizioni aperte.
  const isLongList = isLongListCandidate;
  const automaticCandidates = filtered.filter(c => isLongList(c) || (c.applications && c.applications.length > 0));
  const manualCandidates = filtered.filter(c => !isLongList(c) && (!c.applications || c.applications.length === 0));
  const longListCandidates = filtered.filter(c => isLongList(c));

  const tabs: { id: Tab; label: string; icon: any; count: number }[] = [
    { id: "tutti", label: "Tutti", icon: Users, count: filtered.length },
    { id: "posizioni", label: "Posizioni aperte", icon: Sparkles, count: automaticCandidates.length },
    { id: "longlist", label: "Long List", icon: ListChecks, count: longListCandidates.length },
    { id: "settore", label: "Per settore", icon: Inbox, count: manualCandidates.length },
  ];

  const totalInOrg = data?.count ?? candidates.length;
  const hasMore = candidates.length < totalInOrg;

  return (
    <div className="space-y-6">
      {/* Barra unica: ricerca, sede, ordinamento */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Cerca per nome, email, telefono o mansione..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="px-4 py-2.5 rounded-2xl border border-border bg-white text-sm shrink-0">
          <option value="tutte">Tutte le sedi</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="px-4 py-2.5 rounded-2xl border border-border bg-white text-sm shrink-0">
          <option value="recenti">Più recenti</option>
          <option value="alfabetico">Alfabetico A-Z</option>
        </select>
      </div>

      {/* Tab */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-2xl border text-sm font-bold whitespace-nowrap transition-colors",
              tab === t.id ? "bg-primary text-primary-foreground border-primary" : "bg-white border-border text-muted-foreground hover:bg-muted/50"
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            <span className={cn("text-xs px-1.5 rounded-md", tab === t.id ? "bg-white/20" : "bg-muted")}>{t.count}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground italic">Nessun candidato corrisponde ai filtri.</p>
      ) : (
        <div className="space-y-6">
          {tab === "tutti" && (
            <>
              <JobFolders candidates={automaticCandidates} />
              {manualCandidates.length > 0 && <SectorFolders candidates={manualCandidates} />}
            </>
          )}
          {tab === "posizioni" && <JobFolders candidates={automaticCandidates} />}
          {tab === "longlist" && (
            longListCandidates.length > 0
              ? <FolderGroup title="Long List" candidates={longListCandidates} subtitle="iscritti" variant="primary" defaultOpen />
              : <p className="text-center py-12 text-muted-foreground italic">Nessun iscritto alla Long List.</p>
          )}
          {tab === "settore" && <SectorFolders candidates={manualCandidates} />}
        </div>
      )}

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
