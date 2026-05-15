import SearchForm from "@/components/SearchForm";
import ArchivioManager from "@/components/ArchivioManager";
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

  await queryClient.prefetchQuery({
    queryKey: ["candidates-grouped", search, candidateStatus, province],
    queryFn: () => getAllCandidatesAction({ search, candidateStatus, province, limit: 100 }),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="space-y-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Gestione Candidati & AI
          </h1>
          <p className="text-muted-foreground font-medium">
            Visione unificata dell'ecosistema talenti.
          </p>
        </div>

        <SearchForm />

        <ArchivioManager />
      </div>
    </HydrationBoundary>
  );
}

export default AllCandidatesPage;
