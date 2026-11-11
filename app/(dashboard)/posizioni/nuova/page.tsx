export const dynamic = 'force-dynamic';

import PositionForm from '@/components/PositionForm';
import { isMultipostingEnabled } from '@/utils/featureFlags';
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query';

function CreateNewPositionPage() {
  const queryClient = new QueryClient();
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PositionForm multipostingEnabled={isMultipostingEnabled()} />
    </HydrationBoundary>
  );
}
export default CreateNewPositionPage;
