export const dynamic = 'force-dynamic';

import PositionForm from '@/components/PositionForm';
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query';

function CreateNewPositionPage() {
  const queryClient = new QueryClient();
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PositionForm />
    </HydrationBoundary>
  );
}
export default CreateNewPositionPage;
