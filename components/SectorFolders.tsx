'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Folder, FolderOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getSectorsAction } from '@/utils/actions';
import { cn } from '@/lib/utils';
import { useRef } from 'react';

function SectorFolders() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const activeSector = searchParams.get('sector') || 'tutti';

  const { data: sectors, isPending } = useQuery({
    queryKey: ['sectors'],
    queryFn: () => getSectorsAction(),
  });

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft } = scrollRef.current;
      const scrollAmount = 300;
      const scrollTo = direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  const handleSectorClick = (sector: string) => {
    const params = new URLSearchParams(searchParams);
    if (sector === 'tutti') {
      params.delete('sector');
    } else {
      params.set('sector', sector);
    }
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  if (isPending) return <div className='flex gap-4 mb-8 overflow-x-auto pb-2'>
    {[1, 2, 3].map((i) => (
      <div key={i} className='w-40 h-24 bg-muted animate-pulse rounded-2xl' />
    ))}
  </div>;

  return (
    <div className='mb-10 relative group'>
      <div className='flex items-center justify-between mb-4 ml-1'>
        <h3 className='text-sm font-bold uppercase tracking-widest text-muted-foreground'>Sfoglia per Settore</h3>
        <div className='flex gap-2 mr-1'>
          <button
            onClick={() => scroll('left')}
            className='p-1.5 rounded-full bg-card border border-white/10 hover:border-primary/50 text-muted-foreground hover:text-primary transition-all duration-300'
          >
            <ChevronLeft className='w-4 h-4' />
          </button>
          <button
            onClick={() => scroll('right')}
            className='p-1.5 rounded-full bg-card border border-white/10 hover:border-primary/50 text-muted-foreground hover:text-primary transition-all duration-300'
          >
            <ChevronRight className='w-4 h-4' />
          </button>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className='flex gap-4 overflow-x-auto pb-4 no-scrollbar scroll-smooth'
      >
        <button
          onClick={() => handleSectorClick('tutti')}
          className={cn(
            'flex flex-col items-center justify-center min-w-[140px] p-4 rounded-2xl border transition-all duration-300 relative group shrink-0',
            activeSector === 'tutti'
              ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-105'
              : 'bg-card hover:border-primary/50 border-white/20 text-muted-foreground hover:text-primary'
          )}
        >
          <FolderOpen className={cn('w-8 h-8 mb-2', activeSector === 'tutti' ? 'text-primary-foreground' : 'text-primary')} />
          <span className='font-bold text-xs uppercase'>Tutti</span>
        </button>

        {sectors?.map((item) => (
          <button
            key={item.sector}
            onClick={() => handleSectorClick(item.sector)}
            className={cn(
              'flex flex-col items-center justify-center min-w-[140px] p-4 rounded-2xl border transition-all duration-300 relative group shrink-0',
              activeSector === item.sector
                ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-105'
                : 'bg-card hover:border-primary/50 border-white/20 text-muted-foreground hover:text-primary'
            )}
          >
            <Folder className={cn('w-8 h-8 mb-2', activeSector === item.sector ? 'text-primary-foreground' : 'text-primary')} />
            <span className='font-bold text-xs uppercase truncate w-full text-center px-1'>{item.sector}</span>
            <span className={cn('text-[10px] mt-1 font-bold opacity-70', activeSector === item.sector ? 'text-white' : 'text-muted-foreground')}>
              {item.count} candidati
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default SectorFolders;
