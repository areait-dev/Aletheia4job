'use client';

import { useQuery } from '@tanstack/react-query';
import { getCandidateStatsAction } from '@/utils/actions';
import StatsCard, { StatsLoadingCard } from './StatsCard';

function StatsContainer() {
  const { data, isPending } = useQuery({
    queryKey: ['stats'],
    queryFn: () => getCandidateStatsAction(),
  });

  if (isPending)
    return (
      <div className='grid sm:grid-cols-2 lg:grid-cols-4 gap-4'>
        <StatsLoadingCard />
        <StatsLoadingCard />
        <StatsLoadingCard />
        <StatsLoadingCard />
      </div>
    );

  const getStatusCount = (status: string) => {
    return data?.statusStats?.find(s => s.status === status)?.count || 0;
  };

  return (
    <div className='grid sm:grid-cols-2 lg:grid-cols-4 gap-4'>
      <StatsCard title='In cerca' value={getStatusCount('In cerca')} />
      <StatsCard title='Colloquiato' value={getStatusCount('Colloquiato')} />
      <StatsCard title='Inserito' value={getStatusCount('Inserito')} />
      <StatsCard title='Non idoneo' value={getStatusCount('Non idoneo')} />
    </div>
  );
}

export default StatsContainer;
