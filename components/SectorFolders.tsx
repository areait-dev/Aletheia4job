'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Folder, FolderOpen, ChevronLeft, ChevronRight, Grid3X3, List } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getSectorsAction } from '@/utils/actions';
import { cn } from '@/lib/utils';
import { useRef, useState } from 'react';
import { Button } from './ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function SectorFolders() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const activeSector = (searchParams.get('sector') || 'tutti').toLowerCase();
  const [viewMode, setViewMode] = useState<'grid' | 'scroll'>('grid');

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

  if (isPending) return (
    <div className='mb-6'>
      <div className='flex gap-3 mb-3 ml-1'>
        <div className='w-32 h-4 bg-muted animate-pulse rounded' />
      </div>
      <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3'>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className='h-20 bg-muted animate-pulse rounded-2xl' />
        ))}
      </div>
    </div>
  );

  const activeSectorData = sectors?.find(s => s.sector.toLowerCase() === activeSector);

  return (
    <div className='mb-6 space-y-4'>
      {/* Header con breadcrumb e controlli */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <h3 className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>Sfoglia per Settore</h3>
          {activeSector !== 'tutti' && (
            <div className='flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium'>
              <FolderOpen className='w-3 h-3' />
              {activeSectorData?.sector} ({activeSectorData?.count})
            </div>
          )}
        </div>

        <div className='flex items-center gap-2'>
          {/* Toggle view mode */}
          <Button
            variant='ghost'
            size='sm'
            onClick={() => setViewMode(viewMode === 'grid' ? 'scroll' : 'grid')}
            className='h-8 w-8 p-0'
          >
            {viewMode === 'grid' ? <List className='w-4 h-4' /> : <Grid3X3 className='w-4 h-4' />}
          </Button>

          {/* Dropdown per mobile/backup */}
          <div className='hidden sm:block'>
            <Select value={activeSector === 'tutti' ? 'tutti' : activeSector} onValueChange={handleSectorClick}>
              <SelectTrigger className='w-48 h-8 text-xs'>
                <SelectValue placeholder="Seleziona settore" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='tutti'>Tutti i settori</SelectItem>
                {sectors?.map((item) => (
                  <SelectItem key={item.sector} value={item.sector}>
                    {item.sector} ({item.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Contenuto settori */}
      {viewMode === 'grid' ? (
        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3'>
          <button
            onClick={() => handleSectorClick('tutti')}
            className={cn(
              'flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300 group',
              activeSector === 'tutti'
                ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-105'
                : 'bg-card hover:border-primary/50 border-white/20 text-muted-foreground hover:text-primary hover:scale-105'
            )}
          >
            <FolderOpen className={cn('w-6 h-6 mb-2', activeSector === 'tutti' ? 'text-primary-foreground' : 'text-primary')} />
            <span className='font-bold text-xs uppercase text-center'>Tutti</span>
            <span className={cn('text-[10px] mt-1 opacity-70', activeSector === 'tutti' ? 'text-white' : 'text-muted-foreground')}>
              {sectors?.reduce((acc, s) => acc + s.count, 0) || 0} candidati
            </span>
          </button>

          {sectors?.map((item) => {
            const itemSector = item.sector.toLowerCase();
            const isActive = activeSector === itemSector;

            return (
              <button
                key={item.sector}
                onClick={() => handleSectorClick(item.sector)}
                className={cn(
                  'flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300 group',
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-105'
                    : 'bg-card hover:border-primary/50 border-white/20 text-muted-foreground hover:text-primary hover:scale-105'
                )}
              >
                <Folder className={cn('w-6 h-6 mb-2', isActive ? 'text-primary-foreground' : 'text-primary')} />
                <span className='font-bold text-xs uppercase text-center truncate w-full px-1'>{item.sector}</span>
                <span className={cn('text-[10px] mt-1 opacity-70', isActive ? 'text-white' : 'text-muted-foreground')}>
                  {item.count} candidati
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className='relative group'>
          <div className='flex items-center justify-between mb-3'>
            <div className='flex gap-2'>
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
            className='flex gap-3 overflow-x-auto pb-2 no-scrollbar scroll-smooth'
          >
            <button
              onClick={() => handleSectorClick('tutti')}
              className={cn(
                'flex flex-col items-center justify-center min-w-[120px] p-3 rounded-2xl border transition-all duration-300 relative group shrink-0',
                activeSector === 'tutti'
                  ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-105'
                  : 'bg-card hover:border-primary/50 border-white/20 text-muted-foreground hover:text-primary'
              )}
            >
              <FolderOpen className={cn('w-6 h-6 mb-2', activeSector === 'tutti' ? 'text-primary-foreground' : 'text-primary')} />
              <span className='font-bold text-[11px] uppercase'>Tutti</span>
              <span className={cn('text-[9px] mt-1 font-bold opacity-70', activeSector === 'tutti' ? 'text-white' : 'text-muted-foreground')}>
                {sectors?.reduce((acc, s) => acc + s.count, 0) || 0} candidati
              </span>
            </button>

            {sectors?.map((item) => {
              const itemSector = item.sector.toLowerCase();
              const isActive = activeSector === itemSector;

              return (
                <button
                  key={item.sector}
                  onClick={() => handleSectorClick(item.sector)}
                  className={cn(
                    'flex flex-col items-center justify-center min-w-[120px] p-3 rounded-2xl border transition-all duration-300 relative group shrink-0',
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-105'
                      : 'bg-card hover:border-primary/50 border-white/20 text-muted-foreground hover:text-primary'
                  )}
                >
                  <Folder className={cn('w-6 h-6 mb-2', isActive ? 'text-primary-foreground' : 'text-primary')} />
                  <span className='font-bold text-[11px] uppercase truncate w-full text-center px-1'>{item.sector}</span>
                  <span className={cn('text-[9px] mt-1 font-bold opacity-70', isActive ? 'text-white' : 'text-primary-foreground')}>
                    {item.count} candidati
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default SectorFolders;
