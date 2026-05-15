"use client";

import CandidateCard from "./JobCard";
import { useSearchParams } from "next/navigation";
import { getAllCandidatesAction } from "@/utils/actions";
import { useQuery } from "@tanstack/react-query";
import DownloadDropdown from "./DownloadDropdown";
import ComplexButtonContainer from "./ComplexButtonContainer";

function CandidatesList() {
  const searchParams = useSearchParams();
  const search = searchParams.get("search") || "";
  const candidateStatus = searchParams.get("candidateStatus") || "tutti";
  const province = searchParams.get("province") || "tutte";
  const sector = searchParams.get("sector") || "tutti";
  const pageNumber = Number(searchParams.get("page")) || 1;

  const { data, isPending } = useQuery({
    queryKey: ["candidates", search, candidateStatus, province, sector, pageNumber],
    queryFn: () => getAllCandidatesAction({ 
      search, 
      candidateStatus, 
      province, 
      sector,
      page: pageNumber 
    }),
  });

  const candidates = data?.candidates || [];
  const count = data?.count || 0;
  const page = data?.page || 0;
  const totalPages = data?.totalPages || 0;

  if (isPending) return <h2 className="text-xl">Caricamento in corso...</h2>;

  if (candidates.length < 1) return <h2 className="text-xl">Nessun candidato trovato...</h2>;

  return (
    <>
      <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold ">
              Candidati arrivati da Job Application
            </h2>
            <p className="text-sm text-muted-foreground">
              {count} candidati trovati in totale
            </p>
          </div>
          <DownloadDropdown />
        </div>

        {totalPages < 2 ? null : (
          <ComplexButtonContainer currentPage={page} totalPages={totalPages} />
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {candidates.map((candidate) => {
          return <CandidateCard key={candidate.id} candidate={candidate} />;
        })}
      </div>
    </>
  );
}

export default CandidatesList;
