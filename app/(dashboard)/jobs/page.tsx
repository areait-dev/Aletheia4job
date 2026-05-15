export const dynamic = 'force-dynamic';

import CandidatesList from "@/components/JobsList";
import SearchForm from "@/components/SearchForm";
import SectorFolders from "@/components/SectorFolders";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { getAllCandidatesAction } from "@/utils/actions";
import { GetAllCandidatesActionTypes } from "@/utils/types";

async function AllCandidatesPage({ searchParams }: { searchParams: GetAllCandidatesActionTypes }) {
  const queryClient = new QueryClient();
  const search = searchParams.search || "";
  const candidateStatus = searchParams.candidateStatus || "tutti";
  const province = searchParams.province || "tutte";
  const sector = searchParams.sector || "tutti";
  const page = Number(searchParams.page) || 1;

  await queryClient.prefetchQuery({
    queryKey: ["candidates", search, candidateStatus, province, sector, page],
    queryFn: () => getAllCandidatesAction({ search, candidateStatus, province, sector, page }),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">Gestione Candidati & AI Matching</h1>
        <p className="text-muted-foreground mt-2">
          Archivio completo dei CV ricevuti tramite Career Page e candidature dirette.
        </p>
      </div>
      <SearchForm />
      <SectorFolders />
      <CandidatesList />
    </HydrationBoundary>
  );
}

export default AllCandidatesPage;
