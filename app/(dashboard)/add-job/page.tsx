import CreateCandidateForm from '@/components/CreateCandidateForm';
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query';

function AddCandidatePage() {
  const queryClient = new QueryClient();
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CreateCandidateForm />
    </HydrationBoundary>
  );
}
export default AddCandidatePage;
