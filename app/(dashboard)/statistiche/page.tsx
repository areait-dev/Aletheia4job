import dynamic from 'next/dynamic';
import StatsContainer from '@/components/StatsContainer';
import { getCandidateStatsAction, getChartsDataAction } from '@/utils/actions';
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query';

const ChartsContainer = dynamic(() => import('@/components/ChartsContainer'), { ssr: false });

async function StatsPage() {
  const queryClient = new QueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ['stats'],
      queryFn: () => getCandidateStatsAction(),
    }),
    queryClient.prefetchQuery({
      queryKey: ['charts'],
      queryFn: () => getChartsDataAction(),
    }),
  ]);
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <StatsContainer />
      <ChartsContainer />
    </HydrationBoundary>
  );
}
export default StatsPage;
