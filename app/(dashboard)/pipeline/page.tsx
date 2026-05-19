import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { getAllCandidatesAction, getAllJobsAction } from "@/utils/actions";
import PipelineContent from "@/components/PipelineContent";
import PipelineHeader from "@/components/PipelineHeader";
import SearchForm from "@/components/SearchForm";
import JobFilterSelector from "@/components/JobFilterSelector";

async function PipelinePage({ searchParams }: { searchParams: { search?: string; candidateStatus?: string; province?: string; sector?: string; jobId?: string } }) {
  const queryClient = new QueryClient();
  const search = searchParams.search || "";
  const candidateStatus = searchParams.candidateStatus || "tutti";
  const province = searchParams.province || "tutte";
  const sector = searchParams.sector || "tutti";
  const jobId = searchParams.jobId || "";

  const [jobs] = await Promise.all([
    getAllJobsAction(),
    queryClient.prefetchQuery({
      queryKey: ["candidates", "pipeline", search, candidateStatus, province, sector, jobId],
      queryFn: () => getAllCandidatesAction({ search, candidateStatus, province, sector, limit: 200, jobId }),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PipelineHeader />
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <SearchForm />
        </div>
        <JobFilterSelector jobs={jobs} />
      </div>
      <PipelineContent />
    </HydrationBoundary>
  );
}

export default PipelinePage;
