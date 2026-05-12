'use client';

import { useQuery } from "@tanstack/react-query";
import { getAllCandidatesAction } from "@/utils/actions";
import KanbanBoard from "./KanbanBoard";
import { useSearchParams } from "next/navigation";

export default function PipelineContent() {
  const searchParams = useSearchParams();
  const sector = searchParams.get("sector") || "tutti";
  const candidateStatus = searchParams.get("candidateStatus") || "tutti";
  const province = searchParams.get("province") || "tutte";
  const search = searchParams.get("search") || "";
  const jobId = searchParams.get("jobId") || "";

  const { data, isPending } = useQuery({
    queryKey: ["candidates", "pipeline", search, candidateStatus, province, sector, jobId],
    queryFn: () => getAllCandidatesAction({ search, candidateStatus, province, sector, limit: 2000, jobId }),
  });

  if (isPending) return <div className="text-muted-foreground animate-pulse text-center py-20 font-bold">Caricamento Pipeline...</div>;

  const hasActiveFilters = search || candidateStatus !== "tutti" || province !== "tutte" || sector !== "tutti";
  const hasResults = data?.candidates && data.candidates.length > 0;

  if (hasActiveFilters && !isPending && !hasResults) {
    return (
      <div className="text-center py-20">
        <div className="text-muted-foreground/60 text-lg mb-4">
          🔍 Nessun candidato trovato
        </div>
        <div className="text-sm text-muted-foreground/40">
          Prova a modificare i filtri di ricerca
        </div>
      </div>
    );
  }

  return <KanbanBoard candidates={data?.candidates || []} />;
}
