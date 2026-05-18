import EditCandidateForm from '@/components/EditJobForm';
import { getSingleCandidateAction } from '@/utils/actions';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { notFound } from 'next/navigation';

async function EditCandidatePage({ params }: { params: { id: string } }) {
  const queryClient = new QueryClient();

  const candidate = await queryClient.fetchQuery({
    queryKey: ['candidate', params.id],
    queryFn: () => getSingleCandidateAction(params.id),
  });
  if (!candidate) notFound();

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <EditCandidateForm candidateId={params.id} />
    </HydrationBoundary>
  );
}

export default EditCandidatePage;
