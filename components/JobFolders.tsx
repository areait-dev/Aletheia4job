'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Briefcase, Folder, FolderOpen, ChevronLeft, ChevronRight, Grid3X3, List } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getAllJobsAction } from '@/utils/actions/jobs';
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

function JobFolders() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const activeJobId = searchParams.get('jobId') || 'tutte';
  const [viewMode, setViewMode] = useState<'grid' | 'scroll'>('grid');

  const { data: jobs, isPending } = useQuery({
    queryKey: ['jobs-folders'],
    queryFn: () => getAllJobsAction(),
  });

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft } = scrollRef.current;
      const scrollAmount = 300;
      const scrollTo = direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  const handleJobClick = (jobId: string) => {
    const params = new URLSearchParams(searchParams);
    if (jobId === 'tutte') {
      params.delete('jobId');
    } else {
      params.set('jobId', jobId);
    }
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  if (isPending) return (
    <div className='mb-8'>
      <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3'>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className='h-24 bg-muted animate-pulse rounded-2xl' />
        ))}
      </div>
    </div>
  );

  const activeJobData = jobs?.find(j => j.id === activeJobId);

  return (
    <div className='mb-8 space-y-4'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <h3 className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>Offerte di Lavoro / Posizioni</h3>
          {activeJobId !== 'tutte' && (
            <div className='flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium'>
              <Briefcase className='w-3 h-3' />
              {activeJobData?.title} ({activeJobData?._count.applications})
            </div>
          )}
        </div>

        <div className='flex items-center gap-2'>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => setViewMode(viewMode === 'grid' ? 'scroll' : 'grid')}
            className='h-8 w-8 p-0'
          >
            {viewMode === 'grid' ? <List className='w-4 h-4' /> : <Grid3X3 className='w-4 h-4' />}
          </Button>

          <div className='hidden sm:block'>
            <Select value={activeJobId} onValueChange={handleJobClick}>
              <SelectTrigger className='w-48 h-8 text-xs'>
                <SelectValue placeholder="Seleziona posizione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='tutte'>Tutte le posizioni</SelectItem>
                {jobs?.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.title} ({item._count.applications})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3'>
          <button
            onClick={() => handleJobClick('tutte')}
            className={cn(
              'flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300 group',
              activeJobId === 'tutte'
                ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-105'
                : 'bg-card hover:border-primary/50 border-white/20 text-muted-foreground hover:text-primary hover:scale-105'
            )}
          >
            <FolderOpen className={cn('w-6 h-6 mb-2', activeJobId === 'tutte' ? 'text-primary-foreground' : 'text-primary')} />
            <span className='font-bold text-xs uppercase text-center'>Tutte</span>
            <span className={cn('text-[10px] mt-1 opacity-70', activeJobId === 'tutte' ? 'text-white' : 'text-muted-foreground')}>
              Totale candidati
            </span>
          </button>

          {jobs?.map((item) => {
            const isActive = activeJobId === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleJobClick(item.id)}
                className={cn(
                  'flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300 group relative',
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-105'
                    : 'bg-card hover:border-primary/50 border-white/20 text-muted-foreground hover:text-primary hover:scale-105'
                )}
              >
                <Folder className={cn('w-6 h-6 mb-2', isActive ? 'text-primary-foreground' : 'text-primary')} />
                <span className='font-bold text-[10px] uppercase text-center truncate w-full px-1'>{item.title}</span>
                <span className={cn('text-[10px] mt-1 opacity-70', isActive ? 'text-white' : 'text-muted-foreground')}>
                  {item._count.applications} candidature
                </span>
                <div className='absolute top-2 right-2'>
                   <Briefcase className={cn('w-2 h-2', isActive ? 'text-primary-foreground/50' : 'text-muted-foreground/30')} />
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div
          ref={scrollRef}
          className='flex gap-3 overflow-x-auto pb-2 no-scrollbar scroll-smooth'
        >
          <button
            onClick={() => handleJobClick('tutte')}
            className={cn(
              'flex flex-col items-center justify-center min-w-[130px] p-3 rounded-2xl border transition-all duration-300 shrink-0',
              activeJobId === 'tutte'
                ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20'
                : 'bg-card hover:border-primary/50 border-white/20 text-muted-foreground hover:text-primary'
            )}
          >
            <FolderOpen className={cn('w-6 h-6 mb-2', activeJobId === 'tutte' ? 'text-primary-foreground' : 'text-primary')} />
            <span className='font-bold text-[10px] uppercase'>Tutte</span>
          </button>

          {jobs?.map((item) => {
            const isActive = activeJobId === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleJobClick(item.id)}
                className={cn(
                  'flex flex-col items-center justify-center min-w-[130px] p-3 rounded-2xl border transition-all duration-300 shrink-0',
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20'
                    : 'bg-card hover:border-primary/50 border-white/20 text-muted-foreground hover:text-primary'
                )}
              >
                <Folder className={cn('w-6 h-6 mb-2', isActive ? 'text-primary-foreground' : 'text-primary')} />
                <span className='font-bold text-[10px] uppercase truncate w-full text-center px-1'>{item.title}</span>
                <span className={cn('text-[9px] mt-1 opacity-70', isActive ? 'text-white' : 'text-muted-foreground')}>
                  {item._count.applications} candidati
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default JobFolders;
