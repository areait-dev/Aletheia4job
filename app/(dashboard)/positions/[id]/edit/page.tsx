import PositionForm from '@/components/PositionForm';
import { getSingleJobAction } from '@/utils/actions';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { notFound } from 'next/navigation';

async function EditPositionPage({ params }: { params: { id: string } }) {
  const queryClient = new QueryClient();

  const job = await queryClient.fetchQuery({
    queryKey: ['job', params.id],
    queryFn: () => getSingleJobAction(params.id),
  });
  if (!job) notFound();

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PositionForm jobId={params.id} />
    </HydrationBoundary>
  );
}

export default EditPositionPage;
