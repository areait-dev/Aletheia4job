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

  return (
    <div className='grid sm:grid-cols-2 lg:grid-cols-4 gap-4'>
      <StatsCard title='In cerca' value={data?.['In cerca'] || 0} />
      <StatsCard title='Colloquiato' value={data?.Colloquiato || 0} />
      <StatsCard title='Inserito' value={data?.Inserito || 0} />
      <StatsCard title='Non idoneo' value={data?.['Non idoneo'] || 0} />
    </div>
  );
}

export default StatsContainer;
