'use client';

import { Input } from './ui/input';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from './ui/button';
import { Search, MapPin } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

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
  const [searchValue, setSearchValue] = useState(searchParams.get('search') || '');
  const [provinceValue, setProvinceValue] = useState(searchParams.get('province') || '');
  const candidateStatus = searchParams.get('candidateStatus') || 'tutti';
  
  const router = useRouter();
  const pathname = usePathname();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const updateSearchParams = (search: string, province: string, status: string) => {
    const params = new URLSearchParams(searchParams);
    
    if (search.trim()) {
      params.set('search', search.trim());
    } else {
      params.delete('search');
    }

    if (province.trim()) {
      params.set('province', province.trim());
    } else {
      params.delete('province');
    }

    if (status && status !== 'tutti') {
      params.set('candidateStatus', status);
    } else {
      params.delete('candidateStatus');
    }

    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  const debouncedUpdate = (fn: () => void) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fn, 300);
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    if (value.trim() === '') {
      updateSearchParams('', provinceValue, candidateStatus);
    } else {
      debouncedUpdate(() => updateSearchParams(value, provinceValue, candidateStatus));
    }
  };

  const handleProvinceChange = (value: string) => {
    setProvinceValue(value);
    if (value.trim() === '') {
      updateSearchParams(searchValue, '', candidateStatus);
    } else {
      debouncedUpdate(() => updateSearchParams(searchValue, value, candidateStatus));
    }
  };

  const handleStatusChange = (value: string) => {
    updateSearchParams(searchValue, provinceValue, value);
  };

  useEffect(() => {
    const searchParam = searchParams.get('search') || '';
    const provinceParam = searchParams.get('province') || '';
    setSearchValue(searchParam);
    setProvinceValue(provinceParam);
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Forza l'aggiornamento immediato al submit
    updateSearchParams(searchValue, provinceValue, candidateStatus);
  };

  // Controlla se ci sono filtri attivi
  const hasActiveFilters = searchValue.trim() || provinceValue.trim() || candidateStatus !== 'tutti' || searchParams.get('sector');

  // Ottieni il settore attivo
  const activeSector = searchParams.get('sector');

  return (
    <form
      className={`glass mb-8 p-4 sm:p-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 rounded-2xl sm:rounded-3xl items-end shadow-xl border-white/20 transition-all duration-300 ${
        hasActiveFilters ? 'ring-2 ring-primary/20 shadow-primary/10' : ''
      }`}
      onSubmit={handleSubmit}
    >
      <div className='space-y-2'>
        <label className='text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1'>Ricerca Libera</label>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
          <Input
            type='text'
            placeholder='Nome, ruolo, città...'
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            className='pl-10 bg-muted/20 dark:bg-muted/10 border-white/10 dark:border-white/5 rounded-xl h-12 focus-visible:ring-primary shadow-inner'
          />
        </div>
      </div>

      <div className='space-y-2'>
        <label className='text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1'>Stato</label>
        <Select value={candidateStatus} onValueChange={handleStatusChange}>
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
            value={provinceValue}
            onChange={(e) => handleProvinceChange(e.target.value)}
            className='pl-10 bg-muted/20 dark:bg-muted/10 border-white/10 dark:border-white/5 rounded-xl h-12 focus-visible:ring-primary shadow-inner'
          />
        </div>
      </div>

      <div className='flex items-end gap-3'>
        <div className='text-xs text-muted-foreground/60 italic flex items-center gap-2'>
          {hasActiveFilters ? '🔍 Ricerca attiva' : 'La ricerca è automatica mentre digiti'}
          {activeSector && (
            <span className='px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium'>
              Settore: {activeSector}
            </span>
          )}
        </div>
        {hasActiveFilters && (
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => {
              const params = new URLSearchParams();
              params.set('page', '1');
              router.push(`${pathname}?${params.toString()}`);
              setSearchValue('');
              setProvinceValue('');
            }}
            className='h-8 px-3 text-xs'
          >
            Reset Tutto
          </Button>
        )}
      </div>
    </form>
  );
}

export default SearchForm;
