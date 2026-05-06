import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { getAllCandidatesAction } from "@/utils/actions";
import PipelineContent from "@/components/PipelineContent";
import SectorFolders from "@/components/SectorFolders";
import PipelineHeader from "@/components/PipelineHeader";

async function PipelinePage({ searchParams }: { searchParams: { sector?: string } }) {
  const queryClient = new QueryClient();
  const sector = searchParams.sector || "tutti";

  // Fetchiamo un numero maggiore di candidati per la pipeline (es. 2000)
  await queryClient.prefetchQuery({
    queryKey: ["candidates", "pipeline", sector],
    queryFn: () => getAllCandidatesAction({ sector, limit: 2000 }),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PipelineHeader />
      <SectorFolders />
      <PipelineContent />
    </HydrationBoundary>
  );
}

export default PipelinePage;
