'use client';

import { CandidateType } from "@/utils/types";
import { Folder, FolderOpen, ChevronDown, Search } from "lucide-react";
import CandidateCard from "./JobCard";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

interface SectorFoldersProps {
  candidates: CandidateType[];
}

type SortOption = 'recenti' | 'alfabetico';

function matchesSearch(candidate: CandidateType, query: string): boolean {
  const haystack = [
    candidate.firstName,
    candidate.lastName,
    candidate.email,
    candidate.phone,
    candidate.role,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

function SectorFolders({ candidates }: SectorFoldersProps) {
  const [searchText, setSearchText] = useState('');
  const [cityFilter, setCityFilter] = useState('tutte');
  const [sortBy, setSortBy] = useState<SortOption>('recenti');

  // Sedi disponibili calcolate sull'intero set (non su quello già filtrato),
  // così il dropdown non "si svuota" mentre l'utente filtra.
  const availableCities = useMemo(() => {
    const cities = new Set<string>();
    candidates.forEach((c) => {
      if (c.city && c.city !== 'N/D') cities.add(c.city);
    });
    return Array.from(cities).sort((a, b) => a.localeCompare(b));
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    let result = candidates.filter((c) => {
      if (query && !matchesSearch(c, query)) return false;
      if (cityFilter !== 'tutte' && c.city !== cityFilter) return false;
      return true;
    });

    result = [...result].sort((a, b) => {
      if (sortBy === 'alfabetico') {
        const nameA = `${a.firstName} ${a.lastName}`.trim().toLowerCase();
        const nameB = `${b.firstName} ${b.lastName}`.trim().toLowerCase();
        return nameA.localeCompare(nameB);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [candidates, searchText, cityFilter, sortBy]);

  // Raggruppamento per Settore: resta il criterio principale di
  // organizzazione. Ricerca e filtri agiscono nascondendo le card che non
  // corrispondono all'interno di questa struttura, senza appiattire i
  // risultati in un'unica lista.
  const groupedBySector: Record<string, CandidateType[]> = {};
  filteredCandidates.forEach(c => {
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

  const hasActiveFilters = searchText.trim() !== '' || cityFilter !== 'tutte';

  return (
    <div className="space-y-6">
      {/* Barra di ricerca e filtri */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Cerca per nome, cognome, email, telefono o mansione..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-border bg-white text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
          />
        </div>

        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="px-4 py-2.5 rounded-2xl border border-border bg-white text-sm shrink-0 focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="tutte">Tutte le sedi</option>
          {availableCities.map((city) => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="px-4 py-2.5 rounded-2xl border border-border bg-white text-sm shrink-0 focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="recenti">Più recenti</option>
          <option value="alfabetico">Alfabetico A-Z</option>
        </select>
      </div>

      {hasActiveFilters && (
        <p className="text-xs text-muted-foreground px-1">
          {filteredCandidates.length} risultat{filteredCandidates.length === 1 ? 'o' : 'i'} su {candidates.length}
        </p>
      )}

      {filteredCandidates.length === 0 ? (
        <div className="text-center py-12 bg-muted/20 rounded-3xl border border-dashed">
          <p className="text-muted-foreground italic">Nessun candidato corrisponde ai filtri selezionati.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedBySector).map(([sector, items]) => (
            <FolderGroup key={sector} title={sector} candidates={items} variant="default" />
          ))}
        </div>
      )}
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
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch animate-in fade-in slide-in-from-top-2 duration-300">
          {candidates.map(candidate => (
            <CandidateCard key={candidate.id} candidate={candidate} />
          ))}
        </div>
      )}
    </div>
  );
}

export default SectorFolders;
