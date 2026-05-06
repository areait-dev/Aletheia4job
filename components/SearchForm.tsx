'use client';

import { Input } from './ui/input';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from './ui/button';
import { Search, MapPin } from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CandidateStatus } from '@/utils/types';

function SearchForm() {
  const searchParams = useSearchParams();
  const search = searchParams.get('search') || '';
  const candidateStatus = searchParams.get('candidateStatus') || 'tutti';
  const province = searchParams.get('province') || 'tutte';
  
  const router = useRouter();
  const pathname = usePathname();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    let params = new URLSearchParams();

    const formData = new FormData(e.currentTarget);
    const search = formData.get('search') as string;
    const status = formData.get('candidateStatus') as string;
    const province = formData.get('province') as string;
    
    if (search) params.set('search', search);
    if (status) params.set('candidateStatus', status);
    if (province) params.set('province', province);

    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <form
      className='glass mb-8 p-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-6 rounded-3xl items-end shadow-xl border-white/20'
      onSubmit={handleSubmit}
    >
      <div className='space-y-2'>
        <label className='text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1'>Ricerca Libera</label>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
          <Input
            type='text'
            placeholder='Nome, ruolo, città...'
            name='search'
            defaultValue={search}
            className='pl-10 bg-muted/20 dark:bg-muted/10 border-white/10 dark:border-white/5 rounded-xl h-12 focus-visible:ring-primary shadow-inner'
          />
        </div>
      </div>

      <div className='space-y-2'>
        <label className='text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1'>Stato</label>
        <Select defaultValue={candidateStatus} name='candidateStatus'>
          <SelectTrigger className='bg-muted/20 dark:bg-muted/10 border-white/10 dark:border-white/5 rounded-xl h-12 focus:ring-primary shadow-inner'>
            <SelectValue placeholder="Tutti gli stati" />
          </SelectTrigger>
          <SelectContent className='rounded-xl'>
            <SelectItem value='tutti'>Tutti gli stati</SelectItem>
            {Object.values(CandidateStatus).map((item) => (
              <SelectItem key={item} value={item} className='capitalize'>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className='space-y-2'>
        <label className='text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1'>Provincia</label>
        <div className='relative'>
          <MapPin className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
          <Input
            type='text'
            placeholder='Es. MI, RM...'
            name='province'
            defaultValue={province === 'tutte' ? '' : province}
            className='pl-10 bg-background/50 border-none rounded-xl h-12 focus-visible:ring-primary uppercase'
            maxLength={2}
          />
        </div>
      </div>

      <Button type='submit' className='h-12 rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all'>
        Applica Filtri
      </Button>
    </form>
  );
}

export default SearchForm;
