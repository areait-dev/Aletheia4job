import EditCandidateForm from '@/components/EditJobForm';
import { getSingleCandidateAction } from '@/utils/actions';

import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query';

async function CandidateDetailPage({ params }: { params: { id: string } }) {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ['candidate', params.id],
    queryFn: () => getSingleCandidateAction(params.id),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <EditCandidateForm candidateId={params.id} />
    </HydrationBoundary>
  );
}
export default CandidateDetailPage;
